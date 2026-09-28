"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition, type FormEvent } from "react";
import { inputClass } from "@/components/form/Fields";
import type { GuestFilters as Filters } from "@/lib/domain/guests";
import { GUEST_SIDE_LABEL, RELATIONSHIP_LABEL, optionsFrom } from "@/lib/labels";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")";

const selectClass = `${inputClass} appearance-none bg-[length:12px] bg-[right_0.8rem_center] bg-no-repeat py-2 pr-8 text-[14px]`;

const RSVP_OPTIONS = [
  { value: "ATTENDING", label: "Attending" },
  { value: "PENDING", label: "Pending" },
  { value: "DECLINED", label: "Declined" },
];

/**
 * Search and filters for the guest list. They live in the URL, so a filtered view survives a
 * reload. A plain GET form, so it works before the page's JavaScript loads too.
 */
export function GuestFilters({ filters, active }: { filters: Filters; active: boolean }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const go = (el: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(el)) if (typeof v === "string" && v.trim()) params.set(k, v.trim());
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/guests?${qs}` : "/guests", { scroll: false }));
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    go(e.currentTarget);
  };

  const select = (name: string, label: string, all: string, value: string | null, options: Array<{ value: string; label: string }>) => (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={`filter-${name}`} className="label-caps text-[10px]">
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value ?? ""}
        onChange={() => form.current && go(form.current)}
        className={selectClass}
        style={{ backgroundImage: CHEVRON }}
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      // Remount when the URL changes (e.g. "Clear"), so the fields show the current filters.
      key={`${filters.q}|${filters.side}|${filters.rsvp}|${filters.rel}`}
      ref={form}
      action="/guests"
      method="get"
      onSubmit={onSubmit}
      role="search"
      aria-label="Find guests"
      aria-busy={pending}
      className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <div className="col-span-2 grid min-w-0 gap-1 sm:col-span-1">
        <label htmlFor="filter-q" className="label-caps text-[10px]">
          Search
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Name or household"
          autoComplete="off"
          className={`${inputClass} py-2 text-[14px]`}
        />
      </div>
      {select("side", "Side", "All sides", filters.side, optionsFrom(GUEST_SIDE_LABEL))}
      {select("rsvp", "RSVP", "All replies", filters.rsvp, RSVP_OPTIONS)}
      {select("rel", "Relationship", "Everyone", filters.rel, optionsFrom(RELATIONSHIP_LABEL))}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-[3px] border border-rule-strong bg-paper px-4 py-[9px] text-[13px] font-medium text-chocolate transition-colors hover:border-chocolate"
        >
          Search
        </button>
        {active ? (
          <Link href="/guests" scroll={false} className="text-[13px] text-rose-ink hover:text-chocolate">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
