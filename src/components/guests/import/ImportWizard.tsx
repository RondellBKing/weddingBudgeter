"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { inputClass } from "@/components/form/Fields";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Divider, Sprig } from "@/components/ui/Ornaments";
import {
  commitImport,
  previewImport,
  type ImportSummary,
  type PreviewData,
} from "@/app/(app)/guests/import/actions";
import { MAX_CSV_CHARS } from "@/app/(app)/guests/import/limits";
import { parseCsv, resolveMapping, type ImportField, type ImportMapping, type ParsedCsv, type SavedMapping } from "@/lib/domain/guest-import";
import { ColumnsStep } from "./ColumnsStep";
import { StepTrail, type StepKey } from "./parts";
import { ReviewStep } from "./ReviewStep";

/** Read a file as UTF-8, falling back to Windows-1252 for spreadsheets saved the old way. */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const selectedByDefault = (p: PreviewData) => new Set(p.diff.rows.filter((r) => r.acceptByDefault).map((r) => r.rowNumber));

export function ImportWizard({ saved, lastImport }: { saved: SavedMapping | null; lastImport: { when: string; fileName: string | null } | null }) {
  const [step, setStep] = useState<StepKey>("file");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({ columns: {}, sideValues: {} });
  const [remembered, setRemembered] = useState<ImportField[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Each step starts at the top of the page, with focus on its heading for screen readers.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const go = (next: StepKey) => {
    setError(null);
    setStep(next);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_CSV_CHARS * 2) {
      setError("That file is much larger than a guest list. Export only the guest list from the RSVP app.");
      return;
    }
    const content = await readText(file);
    setText(content);
    setFileName(file.name);
    setError(null);
  };

  const readFile = () => {
    if (text.length > MAX_CSV_CHARS) {
      setError("That file is larger than a guest list should be. Export only the guest list from the RSVP app.");
      return;
    }
    const p = parseCsv(text);
    if (p.error) {
      setError(p.error);
      return;
    }
    const resolved = resolveMapping(p.headers, saved);
    setParsed(p);
    setMapping(resolved.mapping);
    setRemembered(resolved.remembered);
    go("columns");
    if (p.warning) setError(p.warning);
  };

  const runPreview = () => {
    setError(null);
    startTransition(async () => {
      const res = await previewImport({ text, mapping, fileName });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res);
      setAccepted(selectedByDefault(res));
      go("review");
    });
  };

  const commit = () => {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await commitImport({ text, mapping, fileName, accepted: [...accepted], token: preview.token });
      if (res.ok) {
        setSummary(res.summary);
        go("done");
        return;
      }
      if (res.preview) {
        setPreview(res.preview);
        setAccepted(selectedByDefault(res.preview));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setError(res.error);
    });
  };

  const restart = () => {
    setText("");
    setFileName(null);
    setParsed(null);
    setPreview(null);
    setSummary(null);
    go("file");
  };

  const rows = text.trim() ? Math.max(0, text.trim().split(/\r\n|\r|\n/).length - 1) : 0;

  return (
    <div className="grid gap-6">
      <div ref={heading} tabIndex={-1} className="outline-none">
        <StepTrail current={step} />
      </div>

      {step === "file" ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <Card className="grid content-start gap-6 p-6 sm:p-8 lg:col-span-8">
            <div className="grid gap-2">
              <h2 className="text-[30px] leading-tight">
                Your <em className="italic">file</em>
              </h2>
              <p className="max-w-2xl text-[15px] leading-relaxed text-cocoa">
                Export the guest list from the RSVP app as a CSV file, one row per guest, then choose it here or paste it
                below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                onChange={onFile}
                className="peer sr-only"
              />
              <label
                htmlFor="csv-file"
                className={buttonClass(
                  "secondary",
                  "md",
                  "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-desert-rose",
                )}
              >
                <Icon name="arrow" size={15} className="-rotate-90" />
                Choose a CSV file
              </label>
              {fileName ? (
                <span className="text-[14px] text-cocoa">
                  <span className="font-medium">{fileName}</span>
                  <span className="num text-muted"> · about {rows} {rows === 1 ? "guest" : "guests"}</span>
                </span>
              ) : (
                <span className="text-[13px] text-muted">.csv or tab-separated</span>
              )}
            </div>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-rule" />
              <span className="label-caps text-[10px]">or paste it</span>
              <span className="h-px flex-1 bg-rule" />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="csv-text" className="label-caps">
                CSV text
              </label>
              <textarea
                id="csv-text"
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (fileName) setFileName(null);
                }}
                spellCheck={false}
                placeholder={"Guest ID,Name,Party,RSVP,Meal\n1043,Ava Rivera,The Rivera Family,Accepted,Chicken"}
                className={`${inputClass} num min-h-40 text-[13px] leading-relaxed whitespace-pre`}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-brick">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
              <button type="button" onClick={readFile} disabled={!text.trim()} className={buttonClass("primary")}>
                Continue
              </button>
              <Link href="/guests" className={buttonClass("quiet")}>
                Cancel
              </Link>
            </div>
          </Card>

          <Card className="grid content-start gap-4 p-6 text-[14px] leading-relaxed text-cocoa sm:p-7 lg:col-span-4">
            <p className="label-caps">Good to know</p>
            <ul className="grid gap-3">
              {[
                "Keep the RSVP app's guest ID column if it has one. It makes every re-import exact, even after a name is corrected.",
                "Re-import whenever RSVPs come in. People already on the list are updated, never duplicated.",
                "Nobody is ever removed by an import; people missing from the file are listed so you can decide.",
                lastImport
                  ? `Last import: ${lastImport.when}${lastImport.fileName ? ` (${lastImport.fileName})` : ""}. Its columns will be suggested again.`
                  : "Your column choices are remembered for the next import.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-desert-rose" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {step === "columns" && parsed ? (
        <ColumnsStep
          parsed={parsed}
          fileName={fileName}
          mapping={mapping}
          onChange={setMapping}
          remembered={remembered}
          lastImportWhen={lastImport?.when ?? null}
          onBack={() => go("file")}
          onPreview={runPreview}
          pending={pending}
          error={error}
        />
      ) : null}

      {step === "review" && preview ? (
        <ReviewStep
          preview={preview}
          accepted={accepted}
          onAccept={setAccepted}
          onBack={() => go("columns")}
          onCommit={commit}
          pending={pending}
          error={error}
        />
      ) : null}

      {step === "done" && summary ? (
        <Card framed className="overflow-hidden px-7 py-12 text-center sm:px-14">
          <Sprig className="pointer-events-none absolute -top-2 -left-8 w-40 opacity-80" />
          <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-2 w-40 opacity-80" />
          <div className="relative mx-auto grid max-w-xl justify-items-center gap-5">
            <h2 className="text-[36px] leading-tight sm:text-[44px]">
              The list is <em className="italic">in</em>
            </h2>
            <Divider className="w-32" />
            <dl className="grid w-full max-w-md grid-cols-3 border-y border-rule">
              {[
                [summary.created, "added"],
                [summary.updated, "updated"],
                [summary.unchanged, "unchanged"],
              ].map(([n, label], i) => (
                <div key={label} className={`grid gap-1 py-4 ${i > 0 ? "border-l border-rule" : ""}`}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="num font-display text-4xl leading-none">{n}</dd>
                  <dd className="label-caps text-[10px]">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[15px] leading-relaxed text-cocoa">
              Nothing was deleted.
              {summary.notAccepted > 0 ? ` ${summary.notAccepted} ${summary.notAccepted === 1 ? "change was" : "changes were"} left out.` : ""}
              {summary.problems > 0 ? ` ${summary.problems} ${summary.problems === 1 ? "row" : "rows"} with problems ${summary.problems === 1 ? "was" : "were"} skipped.` : ""}
              {summary.missing > 0 ? ` ${summary.missing} ${summary.missing === 1 ? "guest isn't" : "guests aren't"} in this file and stayed on the list.` : ""}{" "}
              The headcount and the budget have been updated.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/guests" className={buttonClass("primary")}>
                See the guest list
              </Link>
              <button type="button" onClick={restart} className={buttonClass("secondary")}>
                Import another file
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
