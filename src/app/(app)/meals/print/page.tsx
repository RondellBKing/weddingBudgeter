import Link from "next/link";
import { ChildrenLine, ChoiceTable, DietaryList, HeadcountNote, VendorMealList } from "@/components/meals/MealParts";
import { PrintButton } from "@/components/ui/PrintButton";
import { Icon } from "@/components/ui/Icon";
import { requireSession } from "@/lib/auth/require-session";
import { loadMeals } from "@/lib/data/meals";
import { formatDate } from "@/lib/dates";
import { printCss } from "@/components/ui/print-css";

export const metadata = { title: "Meal Counts" };

// Printing hides the app around this page; see printCss.
const PRINT_CSS = printCss("meals-print");

const n = (x: number) => x.toLocaleString("en-US");

function Section({ title, word, id, children }: { title: string; word: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-3">
      <h2 id={id} className="text-[26px] leading-tight print:text-[15pt]">
        {title} <em className="italic">{word}</em>
      </h2>
      {children}
    </section>
  );
}

export default async function MealsPrintPage() {
  await requireSession();
  const { plan, hasGuestList, summary, vendors, total } = await loadMeals();
  const { settings, today } = plan;

  return (
    <div className="meals-print grid gap-8 print:gap-6">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/meals" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          Back to meals
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">Letter, portrait. Counts first, then dietary notes.</span>
          <PrintButton />
        </div>
      </div>

      <article className="grid gap-10 rounded-[3px] border border-rule bg-paper px-5 py-8 shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] sm:px-10 sm:py-12 print:gap-6 print:border-0 print:bg-white print:p-0">
        <header className="print-rule grid justify-items-center gap-2 border-b border-rule pb-7 text-center print:pb-4">
          <p className="label-caps text-rose-ink">Meal counts for the venue</p>
          <h1 className="text-[40px] leading-none sm:text-[52px] print:text-[26pt]">
            {settings.partnerOneName} <em className="italic">&amp;</em> {settings.partnerTwoName}
          </h1>
          <p className="text-[13px] tracking-[0.18em] text-cocoa uppercase print:text-[9pt]">
            {formatDate(settings.weddingDate, "weekday-long")} · {settings.venueName}
          </p>
          <p className="num text-[13px] text-muted print:text-[9pt]">Printed {formatDate(today, "medium")}</p>
        </header>

        <section aria-labelledby="total-h" className="print-rule grid justify-items-center gap-3 border-b border-rule pb-8 text-center print:pb-5">
          <h2 id="total-h" className="label-caps">
            Total meals
          </h2>
          <p className="num font-display text-[72px] leading-none print:text-[40pt]">{n(total.total)}</p>
          <p className="num text-[15px] text-cocoa print:text-[10pt]">
            {n(summary.attending)} attending + {n(summary.pending)} pending + {n(total.vendorMeals)} vendor {total.vendorMeals === 1 ? "meal" : "meals"}
          </p>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted print:text-[9pt]">
            Pending guests are counted as coming until they reply. <HeadcountNote total={total} links={false} />
          </p>
        </section>

        {!hasGuestList ? (
          <p className="text-center text-cocoa">
            No guest list yet. Import it on the <Link href="/guests/import" className="text-rose-ink underline underline-offset-4">guests page</Link> to
            see meal choices here.
          </p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] print:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] print:gap-8">
            <Section title="By meal" word="choice" id="choices-h">
              <ChoiceTable summary={summary} />
              <ChildrenLine summary={summary} />
            </Section>
            <Section title="Vendor" word="meals" id="vendors-h">
              {vendors.rows.length === 0 ? (
                <p className="text-[13px] text-muted print:text-[9pt]">No vendor meals.</p>
              ) : (
                <VendorMealList rows={vendors.rows} total={vendors.total} links={false} />
              )}
            </Section>
          </div>
        )}

        {hasGuestList ? (
          <Section title="Dietary" word="notes" id="dietary-h">
            {summary.dietary.length === 0 ? (
              <p className="text-[13px] text-muted print:text-[9pt]">No dietary notes.</p>
            ) : (
              <DietaryList rows={summary.dietary} links={false} />
            )}
          </Section>
        ) : null}
      </article>
    </div>
  );
}
