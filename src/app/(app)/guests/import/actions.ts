"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { loadImportBasis } from "@/lib/data/guests";
import { prisma } from "@/lib/db";
import {
  buildImport,
  diffFingerprint,
  IMPORT_FIELDS,
  planWrites,
  type DiffRow,
  type ImportDiff,
  type ImportMapping,
} from "@/lib/domain/guest-import";
import type { BudgetBasis, ListEntry, PartyMemberRef } from "@/lib/domain/guests";
import { MAX_CSV_CHARS } from "./limits";

// The import, in two server steps. The browser only ever sends the file and the choices a person
// made (mapping, which rows to accept); the diff is worked out here both times, from the database.

const mappingSchema = z.object({
  columns: z.partialRecord(z.enum(IMPORT_FIELDS), z.string().max(300)),
  sideValues: z.record(z.string().max(300), z.enum(["BRIDE_SIDE", "GROOM_SIDE", "BOTH"])),
});

const previewSchema = z.object({
  text: z.string().min(1, "The file is empty.").max(MAX_CSV_CHARS, "That file is too large to import in one go."),
  mapping: mappingSchema,
  fileName: z.string().max(200).nullable(),
});

const commitSchema = previewSchema.extend({
  accepted: z.array(z.number().int().positive()).max(20_000),
  token: z.string().max(200),
});

export type PreviewRow = Omit<DiffRow, "create" | "update">;

export type PreviewData = {
  diff: Omit<ImportDiff, "rows"> & { rows: PreviewRow[] };
  token: string;
  /** Everyone already on the list (demo guests included, since they count in the plan). */
  existing: Array<ListEntry & { id: string }>;
  party: PartyMemberRef[];
  partners: string[];
  basis: BudgetBasis;
};

export type PreviewResult = ({ ok: true } & PreviewData) | { ok: false; error: string };

export type ImportSummary = {
  rows: number;
  created: number;
  updated: number;
  unchanged: number;
  notAccepted: number;
  problems: number;
  missing: number;
};

export type CommitResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string; /** A fresh preview when the list changed since the last one. */ preview?: PreviewData };

type Loaded = Awaited<ReturnType<typeof loadImportBasis>>;

function tokenFor(text: string, mapping: ImportMapping, diff: ImportDiff): string {
  return createHash("sha256").update(JSON.stringify([text, mapping, diffFingerprint(diff)])).digest("base64url");
}

/** The browser gets the description of each row, not the writes. */
function withoutWrites(row: DiffRow): PreviewRow {
  const copy: Partial<DiffRow> = { ...row };
  delete copy.create;
  delete copy.update;
  return copy as PreviewRow;
}

function previewData(loaded: Loaded, text: string, mapping: ImportMapping, diff: ImportDiff): PreviewData {
  return {
    diff: { ...diff, rows: diff.rows.map(withoutWrites) },
    token: tokenFor(text, mapping, diff),
    existing: loaded.existing.map((g) => ({ id: g.id, fullName: g.fullName, relationship: g.relationship, rsvpStatus: g.rsvpStatus })),
    party: loaded.party,
    partners: loaded.partners,
    basis: loaded.basis,
  };
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.path[0] === "text" ? issue.message : "Something about the import settings didn't make sense. Start again from the file.";
}

/** Dry run: what the import would do. Writes nothing. */
export async function previewImport(input: unknown): Promise<PreviewResult> {
  await requireSession();
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { text, mapping } = parsed.data;

  const loaded = await loadImportBasis();
  const built = buildImport(text, mapping, loaded.existing);
  if (!built.ok) return built;
  return { ok: true, ...previewData(loaded, text, mapping, built.diff) };
}

/** Applies the accepted rows in one transaction and remembers the mapping for next time. */
export async function commitImport(input: unknown): Promise<CommitResult> {
  await requireSession();
  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { text, mapping, fileName, accepted, token } = parsed.data;

  const loaded = await loadImportBasis();
  const built = buildImport(text, mapping, loaded.existing);
  if (!built.ok) return built;
  const { diff, parsed: csv } = built;

  if (tokenFor(text, mapping, diff) !== token) {
    return {
      ok: false,
      error: "The guest list changed since this preview was made. Here's an up-to-date preview; check it and apply again.",
      preview: previewData(loaded, text, mapping, diff),
    };
  }

  const writes = planWrites(diff, accepted);
  const summary: ImportSummary = {
    rows: diff.counts.rows,
    created: writes.creates.length,
    updated: writes.updates.length,
    unchanged: diff.counts.unchanged,
    notAccepted: writes.notAccepted,
    problems: diff.counts.problem,
    missing: diff.counts.missing,
  };
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        if (writes.creates.length > 0) {
          await tx.guest.createMany({ data: writes.creates.map((c) => ({ ...c, lastImportedAt: now })) });
        }
        for (const u of writes.updates) {
          await tx.guest.update({ where: { id: u.id }, data: { ...u.data, lastImportedAt: now } });
        }
        await tx.guestImport.create({
          data: {
            at: now,
            fileName,
            mapping: { columns: mapping.columns, sideValues: mapping.sideValues, headers: csv.headers },
            summary,
          },
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (err) {
    console.error("Guest import failed", err);
    return {
      ok: false,
      error: "The import couldn't be saved, so nothing was changed. The list may have been edited at the same time; preview again and retry.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, summary };
}
