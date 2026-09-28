"use client";

import { inputClass } from "@/components/form/Fields";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  distinctSideValues,
  IMPORT_FIELD_LABEL,
  IMPORT_FIELDS,
  mappingProblem,
  mapSide,
  tidy,
  type GuestSide,
  type ImportField,
  type ImportMapping,
  type ParsedCsv,
} from "@/lib/domain/guest-import";
import { GUEST_SIDE_LABEL } from "@/lib/labels";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")";
const selectClass = `${inputClass} appearance-none bg-[length:12px] bg-[right_0.8rem_center] bg-no-repeat py-2 pr-8 text-[14px]`;

const GROUPS: Array<{ lead: string; word: string; note?: string; fields: Array<{ field: ImportField; hint?: string }> }> = [
  {
    lead: "Who",
    word: "they are",
    fields: [
      { field: "fullName", hint: "Or first and last name, below." },
      { field: "firstName" },
      { field: "lastName" },
      { field: "householdName", hint: "Party, group or invitation. Without it, each guest is their own household." },
      { field: "externalId", hint: "Recommended: it keeps re-imports exact, even when a name is corrected." },
    ],
  },
  {
    lead: "Their",
    word: "reply",
    note: "A blank cell never erases what's already on the list.",
    fields: [{ field: "rsvpStatus" }, { field: "mealChoice" }, { field: "dietaryNotes" }],
  },
  {
    lead: "New guests",
    word: "only",
    note: "Used when someone is added. Guests already on the list keep the side, relationship and notes you've given them.",
    fields: [{ field: "side" }, { field: "relationship" }, { field: "notes" }],
  },
];

function sampleFor(parsed: ParsedCsv, header: string | undefined): string | null {
  if (!header) return null;
  const i = parsed.headers.indexOf(header);
  if (i < 0) return null;
  for (const r of parsed.records.slice(0, 30)) {
    const v = tidy(r.cells[i]);
    if (v) return v.length > 40 ? `${v.slice(0, 40)}…` : v;
  }
  return null;
}

export function ColumnsStep({
  parsed,
  fileName,
  mapping,
  onChange,
  remembered,
  lastImportWhen,
  onBack,
  onPreview,
  pending,
  error,
}: {
  parsed: ParsedCsv;
  fileName: string | null;
  mapping: ImportMapping;
  onChange: (m: ImportMapping) => void;
  remembered: ImportField[];
  lastImportWhen: string | null;
  onBack: () => void;
  onPreview: () => void;
  pending: boolean;
  error: string | null;
}) {
  const problem = mappingProblem(mapping, parsed.headers);
  const used = new Set(Object.values(mapping.columns));
  const unused = parsed.headers.filter((h) => !used.has(h));
  const sideValues = distinctSideValues(parsed, mapping);

  const setColumn = (field: ImportField, header: string) => {
    const columns = { ...mapping.columns };
    // One field per column: choosing a column here takes it away from any other field.
    for (const f of IMPORT_FIELDS) if (header && columns[f] === header) delete columns[f];
    if (header) columns[field] = header;
    else delete columns[field];
    onChange({ ...mapping, columns });
  };

  const setSideValue = (key: string, side: GuestSide | "") => {
    const sideValues = { ...mapping.sideValues };
    if (side) sideValues[key] = side;
    else delete sideValues[key];
    onChange({ ...mapping, sideValues });
  };

  return (
    <Card className="grid gap-8 p-6 sm:p-8">
      <div className="grid gap-2">
        <h2 className="text-[30px] leading-tight">
          Match the <em className="italic">columns</em>
        </h2>
        <p className="max-w-2xl text-[15px] leading-relaxed text-cocoa">
          {fileName ? <span className="font-medium">{fileName}</span> : "Your file"} has{" "}
          <span className="num">{parsed.records.length}</span> {parsed.records.length === 1 ? "row" : "rows"} and{" "}
          <span className="num">{parsed.headers.length}</span> columns. We picked the columns we recognized; check each one.
          Anything set to “Not in this file” is left out.
        </p>
        {remembered.length > 0 && lastImportWhen ? (
          <p className="text-[13px] text-garden-ink">Columns marked “as last time” are from the import on {lastImportWhen}.</p>
        ) : null}
      </div>

      {GROUPS.map((group) => (
        <fieldset key={group.word} className="grid gap-1">
          <legend className="mb-1 font-display text-2xl">
            {group.lead} <em className="italic">{group.word}</em>
          </legend>
          {group.note ? <p className="mb-2 text-[13px] text-muted">{group.note}</p> : null}
          <div className="grid border-t border-rule">
            {group.fields.map(({ field, hint }) => {
              const id = `map-${field}`;
              const header = mapping.columns[field];
              const sample = sampleFor(parsed, header);
              return (
                <div
                  key={field}
                  className="grid gap-x-5 gap-y-1.5 border-b border-rule py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
                >
                  <div className="grid gap-0.5">
                    <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
                      {IMPORT_FIELD_LABEL[field]}
                      {remembered.includes(field) ? <span className="text-[11px] text-garden-ink">as last time</span> : null}
                    </label>
                    {hint ? (
                      <span id={`${id}-hint`} className="text-[12px] leading-snug text-muted">
                        {hint}
                      </span>
                    ) : null}
                  </div>
                  <select
                    id={id}
                    value={header ?? ""}
                    onChange={(e) => setColumn(field, e.target.value)}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    className={selectClass}
                    style={{ backgroundImage: CHEVRON }}
                  >
                    <option value="">Not in this file</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="min-w-0 truncate text-[13px] text-muted">
                    {sample ? (
                      <>
                        <span className="label-caps mr-2 text-[9.5px]">e.g.</span>
                        {sample}
                      </>
                    ) : header ? (
                      "Empty in the first rows"
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          {group.word === "only" && sideValues.length > 0 ? (
            <div className="mt-4 grid gap-3 rounded-[3px] bg-linen/45 p-4 sm:p-5">
              <p className="text-[14px] text-cocoa">
                What does each value in <span className="font-medium">{mapping.columns.side}</span> mean?
              </p>
              <ul className="grid gap-2.5 lg:grid-cols-2 lg:gap-x-10">
                {sideValues.slice(0, 12).map((v) => {
                  const guess = mapSide(v.label).value;
                  const chosen = mapping.sideValues[v.key] ?? guess ?? "";
                  const id = `side-${v.key}`;
                  return (
                    <li key={v.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_13rem]">
                      <label htmlFor={id} className="min-w-0 text-[14px]">
                        <span className="block truncate">“{v.label}”</span>
                        <span className={`block text-[11.5px] ${chosen ? "text-muted" : "text-gold-ink"}`}>
                          {v.count} {v.count === 1 ? "row" : "rows"}
                          {chosen ? "" : " · not recognized; Both unless you choose"}
                        </span>
                      </label>
                      <select
                        id={id}
                        value={chosen}
                        onChange={(e) => setSideValue(v.key, e.target.value as GuestSide | "")}
                        className={selectClass}
                        style={{ backgroundImage: CHEVRON }}
                      >
                        <option value="">Choose…</option>
                        {(Object.keys(GUEST_SIDE_LABEL) as GuestSide[]).map((s) => (
                          <option key={s} value={s}>
                            {GUEST_SIDE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </fieldset>
      ))}

      {unused.length > 0 ? (
        <p className="text-[13px] text-muted">
          <span className="label-caps mr-2 text-[10px]">Not imported</span>
          {unused.join(", ")}
        </p>
      ) : null}

      <div className="grid gap-3 border-t border-rule pt-6">
        {problem || error ? (
          <p role="alert" className="text-sm text-brick">
            {problem ?? error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onPreview} disabled={Boolean(problem) || pending} className={buttonClass("primary")}>
            {pending ? "Comparing…" : "Preview the changes"}
          </button>
          <button type="button" onClick={onBack} className={buttonClass("secondary")}>
            Back
          </button>
          <span className="text-[13px] text-muted">Nothing is saved until you&apos;ve reviewed it.</span>
        </div>
      </div>
    </Card>
  );
}
