import Link from "next/link";
import { PrintButton } from "@/components/seating/PrintButton";
import { Icon } from "@/components/ui/Icon";
import { requireSession } from "@/lib/auth/require-session";
import { loadPlan } from "@/lib/data/plan";
import { loadSeatingPrint, type PrintGuest } from "@/lib/data/seating";
import { formatDate } from "@/lib/dates";
import { capacityStatus, guestIndex, guestsByTable, orderAtTable, seatingCounts, surnameFirst } from "@/lib/domain/seating";
import { TABLE_SHAPE_LABEL } from "@/lib/labels";

export const metadata = { title: "Seating Chart" };

// When printing, hide the app around this page (sidebar, phone header and bottom bar, banners)
// by hiding everything that isn't <main> or one of its ancestors. Scoped to this page only.
const PRINT_CSS = `
@media print {
  @page { size: letter portrait; margin: 0.5in; }
  html, body { background: #fff !important; }
  *:has(> * > #main) { display: block !important; min-height: 0 !important; padding: 0 !important; }
  *:has(> * > #main) > :not(:has(#main)) { display: none !important; }
  *:has(> #main) { padding: 0 !important; }
  *:has(> #main) > :not(#main) { display: none !important; }
  #main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .seating-print, .seating-print * { color: #000 !important; box-shadow: none !important; }
  .seating-print .print-rule { border-color: #8c8c8c !important; }
  .seating-print .print-hair { border-color: #c8c8c8 !important; }
}
`;

function Note({ guest }: { guest: PrintGuest }) {
  const bits = [guest.isChild ? "Child" : null, guest.mealChoice, guest.dietaryNotes].filter(Boolean);
  if (bits.length === 0) return null;
  return <span className="block text-[11.5px] text-muted print:text-[8pt]">{bits.join(" · ")}</span>;
}

export default async function SeatingPrintPage() {
  await requireSession();
  const [{ tables, guests }, { settings, today }] = await Promise.all([loadSeatingPrint(), loadPlan()]);
  const byTable = guestsByTable(tables, guests);
  const counts = seatingCounts(tables, guests);
  const index = guestIndex(tables, guests);

  return (
    <div className="seating-print grid gap-8 print:gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/seating" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          Back to the seating plan
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">Letter, portrait. Tables first, then an A–Z index.</span>
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-10 rounded-[3px] border border-rule bg-paper px-5 py-8 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:px-10 sm:py-12 print:gap-7 print:border-0 print:bg-white print:p-0">
        <header className="print-rule grid justify-items-center gap-2 border-b border-rule pb-7 text-center print:pb-4">
          <p className="label-caps text-rose-ink">Seating chart</p>
          <h1 className="text-[40px] leading-none sm:text-[52px] print:text-[26pt]">
            {settings.partnerOneName} <em className="italic">&amp;</em> {settings.partnerTwoName}
          </h1>
          <p className="text-[13px] tracking-[0.18em] text-cocoa uppercase print:text-[9pt]">
            {formatDate(settings.weddingDate, "weekday-long")} · {settings.venueName}
          </p>
          <p className="num text-[13px] text-muted print:text-[9pt]">
            {counts.seated} of {counts.guests} guests seated at {counts.tables} {counts.tables === 1 ? "table" : "tables"}
            {counts.unassigned > 0 ? ` · ${counts.unassigned} not seated yet` : ""} · printed {formatDate(today, "medium")}
          </p>
        </header>

        {tables.length === 0 ? (
          <p className="text-center text-cocoa">
            No tables yet. Add them on the <Link href="/seating" className="text-rose-ink underline underline-offset-4">seating plan</Link>.
          </p>
        ) : (
          <section aria-labelledby="by-table-h" className="grid gap-5">
            <h2 id="by-table-h" className="text-[28px] leading-tight print:text-[16pt]">
              Table by <em className="italic">table</em>
            </h2>
            <div className="grid items-start gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
              {tables.map((t) => {
                const people = orderAtTable(byTable.get(t.id) ?? []);
                const cap = capacityStatus(people.length, t.capacity);
                const hasSeatNumbers = people.some((g) => g.seatNumber !== null);
                return (
                  <section
                    key={t.id}
                    aria-label={t.label}
                    className="print-rule grid content-start gap-2 rounded-[3px] border border-rule-strong px-4 py-3.5 break-inside-avoid print:rounded-none print:px-3 print:py-2"
                  >
                    <header className="print-hair flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                      <h3 className="num font-display text-[22px] leading-tight print:text-[13pt]">{t.label}</h3>
                      <span className="num shrink-0 text-[12px] text-cocoa print:text-[9pt]">
                        {TABLE_SHAPE_LABEL[t.shape]} · {people.length} / {t.capacity}
                        {cap.state === "over" ? <strong className="ml-1 text-brick">Over by {cap.over}</strong> : null}
                      </span>
                    </header>
                    {people.length === 0 ? (
                      <p className="text-[13px] text-muted italic print:text-[9pt]">No one seated yet.</p>
                    ) : (
                      <ol className="grid gap-1 text-[13.5px] print:gap-0.5 print:text-[9.5pt]">
                        {people.map((g) => (
                          <li
                            key={g.id}
                            className={`grid items-baseline gap-x-2 ${
                              hasSeatNumbers ? "grid-cols-[1.6rem_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"
                            }`}
                          >
                            {hasSeatNumbers ? (
                              <span className="num text-right text-[11px] text-muted print:text-[8pt]" aria-label="Seat">
                                {g.seatNumber ?? "–"}
                              </span>
                            ) : null}
                            <span className="min-w-0">
                              {g.fullName}
                              <span className="block truncate text-[11.5px] text-muted sm:hidden print:hidden">{g.householdName}</span>
                              <Note guest={g} />
                            </span>
                            <span className="hidden max-w-[11rem] truncate text-right text-[11.5px] text-muted sm:block print:block print:max-w-[2.2in] print:text-[8pt]">
                              {g.householdName}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        )}

        {index.length > 0 ? (
          <section aria-labelledby="index-h" className="grid gap-4 break-before-page">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="index-h" className="text-[28px] leading-tight print:text-[16pt]">
                Guests <em className="italic">A–Z</em>
              </h2>
              <span className="label-caps num">{index.length} guests</span>
            </div>
            <ol className="columns-1 gap-8 text-[13.5px] sm:columns-2 print:columns-2 print:gap-6 print:text-[9.5pt]">
              {index.map(({ guest, table }) => (
                <li
                  key={guest.id}
                  className="print-hair flex items-baseline justify-between gap-3 border-b border-rule py-1.5 break-inside-avoid print:py-[3px]"
                >
                  <span className="min-w-0 truncate">{surnameFirst(guest.fullName)}</span>
                  <span className={`shrink-0 ${table ? "text-chocolate" : "text-muted italic"}`}>{table ? table.label : "Not seated"}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </div>
  );
}
