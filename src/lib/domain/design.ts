// Vision & Décor: readable text on palette swatches, placeholder tints for the inspiration
// board, links, board filters, palette ordering, and the décor status that comes from the dates.
// Pure functions only; the pages and loaders feed them database rows.

import type { DecorSource, DesignArea } from "../../generated/prisma/enums";
import { compareDates, daysBetween, formatDate, relativeDays, type CalendarDate } from "../dates";
import { normalizeWebUrl } from "./vendor-contact";

// ─── Colors ─────────────────────────────────────────────────────────────────────

/** Ink used on a swatch: a warm near-black (deeper than the page's chocolate) or paper. */
export const SWATCH_INK = { dark: "#1F140F", light: "#FFFCF8" } as const;

type Rgb = [number, number, number];

/** "#b5706b", "B5706B" or " #B5706B " → "#B5706B". Anything else → null. */
export function parseHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(input.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

function rgb(hex: string): Rgb {
  const h = parseHex(hex);
  if (!h) throw new Error(`Not a #RRGGBB color: ${hex}`);
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Dark or light text for a swatch, whichever reads better on it. Light colors (Dusty Rose, Gold)
 * get dark ink; deep ones (Chocolate) get paper.
 */
export function swatchInk(hex: string): { tone: "dark" | "light"; color: string; contrast: number } {
  const dark = contrastRatio(hex, SWATCH_INK.dark);
  const light = contrastRatio(hex, SWATCH_INK.light);
  return dark >= light
    ? { tone: "dark", color: SWATCH_INK.dark, contrast: dark }
    : { tone: "light", color: SWATCH_INK.light, contrast: light };
}

/** Blend `a` into `b`: weight 1 is all `a`, 0 is all `b`. */
export function mixHex(a: string, b: string, weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const x = rgb(a);
  const y = rgb(b);
  return toHex([0, 1, 2].map((i) => x[i] * w + y[i] * (1 - w)) as Rgb);
}

/**
 * A gentle flag for colors that fight the plan (warm tones, gold metals, no silver). Returns a
 * short note, or null when the color is fine. Warm greys and taupes pass.
 */
export function coolToneNote(hex: string): string | null {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.12) {
    // Near-neutral: silver and cool grey lean blue; warm greys lean red.
    return l > 0.45 && l < 0.92 && b >= r ? "Reads as silver. The plan is gold metals only, no silver." : null;
  }
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h >= 170 && h <= 290 ? "Reads as a cool tone. The palette is warm." : null;
}

/** Built-in blush and linen, for placeholders when the palette is empty. */
const FALLBACK_TINTS = ["#D9A3A0", "#B8912F", "#B5706B"];
const PAPER = "#FFFCF8";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Palette colors this dark (Chocolate) wash out to grey, so they make a deep card instead. */
const DEEP_LUMINANCE = 0.08;

/**
 * The placeholder shown for an inspiration item with no image, from one palette color (picked
 * from the item's id, so it never changes between visits): a soft wash of a light color, or a
 * deep card of a dark one, with a frame line and ink that stays readable on it.
 */
export function placeholderTint(seed: string, palette: string[]): { background: string; frame: string; ink: string } {
  const colors = palette.map(parseHex).filter((c): c is string => c !== null);
  const pool = colors.length > 0 ? colors : FALLBACK_TINTS;
  const base = pool[hash(seed) % pool.length];
  const deep = relativeLuminance(base) < DEEP_LUMINANCE;
  const background = deep ? base : mixHex(base, PAPER, 0.26);
  return { background, frame: mixHex(base, PAPER, deep ? 0.55 : 0.6), ink: swatchInk(background).color };
}

// ─── Links ──────────────────────────────────────────────────────────────────────

/** An http(s) link, as pasted ("pinterest.com/pin/1" gets https://). Other schemes → null. */
export function parseHttpUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  return normalizeWebUrl(input);
}

/** "https://www.pinterest.com/pin/123/" → "pinterest.com". */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

// ─── Board ──────────────────────────────────────────────────────────────────────

export type DesignView = "board" | "palette" | "decor";

export type BoardFilters = { area: DesignArea | null; favorites: boolean };

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseDesignView(sp: Params): DesignView {
  const v = one(sp.view);
  return v === "palette" || v === "decor" ? v : "board";
}

export function parseBoardFilters(sp: Params, areas: readonly DesignArea[]): BoardFilters {
  const a = one(sp.area);
  const fav = one(sp.fav);
  return {
    area: a && (areas as readonly string[]).includes(a) ? (a as DesignArea) : null,
    favorites: fav === "1" || fav === "true" || fav === "on",
  };
}

/** "/design?view=decor", "/design?area=FLOWERS&fav=1". The board is the default view. */
export function designHref(view: DesignView, filters: Partial<BoardFilters> = {}): string {
  const q = new URLSearchParams();
  if (view !== "board") q.set("view", view);
  if (view === "board" && filters.area) q.set("area", filters.area);
  if (view === "board" && filters.favorites) q.set("fav", "1");
  const s = q.toString();
  return s ? `/design?${s}` : "/design";
}

/** Only our own pages, so a crafted "back" can't send anyone elsewhere. */
export function safeDesignBack(input: string | null | undefined, fallback = "/design"): string {
  if (!input) return fallback;
  return /^\/design(?:[/?#]|$)/.test(input) && !input.startsWith("//") && !input.includes("\\") ? input : fallback;
}

export function matchesBoard<T extends { area: DesignArea; isFavorite: boolean }>(item: T, f: BoardFilters): boolean {
  return (f.area === null || item.area === f.area) && (!f.favorites || item.isFavorite);
}

/** Group rows by area, in the given area order, skipping empty areas. Row order is kept. */
export function groupByArea<T extends { area: DesignArea }>(
  rows: T[],
  order: readonly DesignArea[],
): Array<{ area: DesignArea; items: T[] }> {
  const by = new Map<DesignArea, T[]>();
  for (const r of rows) {
    const list = by.get(r.area);
    if (list) list.push(r);
    else by.set(r.area, [r]);
  }
  return order.filter((a) => by.has(a)).map((area) => ({ area, items: by.get(area)! }));
}

// ─── Palette order ──────────────────────────────────────────────────────────────

/** Move one id a step earlier ("up") or later ("down"). Unchanged at the ends or if missing. */
export function moveInList(ids: readonly string[], id: string, direction: "up" | "down"): string[] {
  const out = [...ids];
  const i = out.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// ─── Décor status, derived from the dates ───────────────────────────────────────

export type DecorDates = {
  orderedOn: CalendarDate | null;
  receivedOn: CalendarDate | null;
  returnBy: CalendarDate | null;
  returnedOn: CalendarDate | null;
};

export type DecorStatusKey = "idea" | "ordered" | "received" | "return-due" | "return-overdue" | "returned";

/** neutral · progress (rose) · on-track (garden) · due-soon (gold) · overdue (brick). */
export type DecorTone = "neutral" | "progress" | "on-track" | "due-soon" | "overdue";

export type DecorStatus = { key: DecorStatusKey; label: string; detail: string | null; tone: DecorTone };

export const DECOR_STATUS_ORDER: DecorStatusKey[] = ["idea", "ordered", "received", "return-due", "return-overdue", "returned"];

/** A return date this close (in days) shows as due soon. */
export const RETURN_SOON_DAYS = 7;

/** Rentals and borrowed pieces go back; so does anything else given a return date. */
export function needsReturn(item: { source: DecorSource; returnBy: CalendarDate | null }): boolean {
  return item.source === "RENTAL" || item.source === "BORROWED" || item.returnBy !== null;
}

function shortDate(date: CalendarDate, today: CalendarDate): string {
  return date.slice(0, 4) === today.slice(0, 4) ? formatDate(date, "month-day") : formatDate(date, "medium");
}

/**
 * Idea (nothing dated) → Ordered → Received → for pieces that go back, "Return by <date>" until
 * returned ("Return overdue" once today is past the date) → Returned. The return date is on time
 * through the end of that day.
 */
export function decorStatus(item: { source: DecorSource } & DecorDates, today: CalendarDate): DecorStatus {
  const { orderedOn, receivedOn, returnBy, returnedOn } = item;
  if (returnedOn) {
    return { key: "returned", label: "Returned", detail: `Returned ${shortDate(returnedOn, today)}`, tone: "on-track" };
  }
  if (receivedOn) {
    const received = `Received ${shortDate(receivedOn, today)}`;
    if (needsReturn(item)) {
      if (!returnBy) return { key: "received", label: "Received", detail: `${received}. No return date yet`, tone: "on-track" };
      const days = daysBetween(today, returnBy);
      if (days < 0) {
        return {
          key: "return-overdue",
          label: "Return overdue",
          detail: `Was due ${shortDate(returnBy, today)} (${relativeDays(days).toLowerCase()})`,
          tone: "overdue",
        };
      }
      return {
        key: "return-due",
        label: `Return by ${shortDate(returnBy, today)}`,
        detail: `${received}. Due back ${relativeDays(days).toLowerCase()}`,
        tone: days <= RETURN_SOON_DAYS ? "due-soon" : "on-track",
      };
    }
    return { key: "received", label: "Received", detail: received, tone: "on-track" };
  }
  if (orderedOn) {
    const back = needsReturn(item) && returnBy ? `. Goes back by ${shortDate(returnBy, today)}` : "";
    return { key: "ordered", label: "Ordered", detail: `Ordered ${shortDate(orderedOn, today)}${back}`, tone: "progress" };
  }
  return { key: "idea", label: "Idea", detail: null, tone: "neutral" };
}

export type DecorStep = "ordered" | "received" | "returned";

/** The one quick action that moves an item along, or null when there's nothing left to do. */
export function nextDecorStep(item: { source: DecorSource } & DecorDates): DecorStep | null {
  if (item.returnedOn) return null;
  if (item.receivedOn) return needsReturn(item) ? "returned" : null;
  if (item.orderedOn) return "received";
  return "ordered";
}

export const DECOR_STEP_LABEL: Record<DecorStep, string> = {
  ordered: "Mark ordered today",
  received: "Mark received today",
  returned: "Mark returned today",
};

/** Dates that can't all be true at once, keyed by form field. Empty when they're fine. */
export function decorDateErrors(d: DecorDates): Partial<Record<keyof DecorDates, string>> {
  const errors: Partial<Record<keyof DecorDates, string>> = {};
  if (d.orderedOn && d.receivedOn && compareDates(d.receivedOn, d.orderedOn) < 0) {
    errors.receivedOn = "It can't arrive before it was ordered.";
  }
  if (d.receivedOn && d.returnBy && compareDates(d.returnBy, d.receivedOn) < 0) {
    errors.returnBy = "The return date is before it arrives.";
  }
  if (d.returnedOn && !d.receivedOn) errors.returnedOn = "Add the day it arrived first.";
  else if (d.returnedOn && d.receivedOn && compareDates(d.returnedOn, d.receivedOn) < 0) {
    errors.returnedOn = "It can't go back before it arrived.";
  }
  return errors;
}

export type DecorSummary = {
  total: number;
  counts: Record<DecorStatusKey, number>;
  /** Received or already back: in hand at some point. */
  inHand: number;
  overdue: Array<{ id: string; name: string; returnBy: CalendarDate }>;
  /** The soonest return still ahead (today counts). */
  nextReturn: { id: string; name: string; returnBy: CalendarDate } | null;
};

export function decorSummary<T extends { id: string; name: string; source: DecorSource } & DecorDates>(
  items: T[],
  today: CalendarDate,
): DecorSummary {
  const counts = Object.fromEntries(DECOR_STATUS_ORDER.map((k) => [k, 0])) as Record<DecorStatusKey, number>;
  const overdue: DecorSummary["overdue"] = [];
  let nextReturn: DecorSummary["nextReturn"] = null;
  for (const item of items) {
    const s = decorStatus(item, today);
    counts[s.key]++;
    if (s.key === "return-overdue") overdue.push({ id: item.id, name: item.name, returnBy: item.returnBy! });
    if (s.key === "return-due" && (!nextReturn || compareDates(item.returnBy!, nextReturn.returnBy) < 0)) {
      nextReturn = { id: item.id, name: item.name, returnBy: item.returnBy! };
    }
  }
  overdue.sort((a, b) => compareDates(a.returnBy, b.returnBy) || a.name.localeCompare(b.name));
  return {
    total: items.length,
    counts,
    inHand: counts.received + counts["return-due"] + counts["return-overdue"] + counts.returned,
    overdue,
    nextReturn,
  };
}
