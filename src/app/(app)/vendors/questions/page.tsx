import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { PrintButton } from "@/components/ui/PrintButton";
import { printCss } from "@/components/ui/print-css";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { requireSession } from "@/lib/auth/require-session";
import { loadInterviewGuide } from "@/lib/data/vendors";
import { formatDate } from "@/lib/dates";
import { FOR_EVERY_VENDOR, guideFor, particularTo, standardQuestions, type QuestionTopic } from "@/lib/domain/vendor-questions";
import { isVendorCategory, VENDOR_CATEGORIES, VENDOR_CATEGORY_LABEL } from "@/lib/domain/vendors";

export const metadata = { title: "Questions to Ask" };

// Printing hides the app around the guide; see printCss.
const PRINT_CSS = printCss(
  "guide-print",
  `
  .guide-print .print-box { border-color: #000 !important; }`,
);

/** Every kind of vendor the guide covers ("Other" has nothing particular to ask). */
const GUIDE_CATEGORIES = VENDOR_CATEGORIES.filter((c) => c !== "OTHER");

const chip = "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors";
const chipOn = "border-chocolate bg-chocolate text-ivory";
const chipOff = "border-rule-strong bg-paper text-cocoa hover:border-chocolate hover:text-chocolate";

/** The topics as numbered parts, each question with a box to tick and, on paper, room to write. */
function Interview({ topics }: { topics: QuestionTopic[] }) {
  // Numbered straight through, so "question 12" means the same thing on the phone and on paper.
  const firstNumber = topics.map((_, i) => 1 + topics.slice(0, i).reduce((sum, t) => sum + t.questions.length, 0));
  return (
    <div className="grid">
      {topics.map((t, i) => (
        <section
          key={t.topic}
          aria-label={t.topic}
          className="print-hair grid gap-3 border-b border-rule py-6 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 print:grid-cols-[1.5in_minmax(0,1fr)] print:gap-5 print:py-[10pt]"
        >
          <div className="grid content-start gap-1 break-after-avoid">
            <p className="label-caps num text-[10px] text-gold-ink print:text-[7pt]">Part {String(i + 1).padStart(2, "0")}</p>
            <h3 className="font-display text-[22px] leading-tight italic print:text-[13pt]">{t.topic}</h3>
          </div>
          <ol className="grid">
            {t.questions.map((q, j) => {
              const n = firstNumber[i] + j;
              return (
                <li
                  key={q}
                  className="print-hair grid grid-cols-[1.5rem_0.9rem_minmax(0,1fr)] items-start gap-x-3 border-b border-rule py-3 break-inside-avoid first:pt-0 last:border-b-0 last:pb-0 print:border-b-0 print:grid-cols-[0.22in_0.14in_minmax(0,1fr)] print:gap-x-2 print:py-[5pt]"
                >
                  <span className="num pt-px text-right text-[12px] text-muted print:text-[8.5pt]">{n}.</span>
                  <span
                    aria-hidden
                    className="print-box mt-[3px] size-3.5 rounded-[2px] border border-rule-strong bg-paper print:mt-[2pt] print:size-[0.13in]"
                  />
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug print:text-[10pt]">{q}</p>
                    {/* Room for the answer on the printout. */}
                    <span aria-hidden className="print-hair hidden border-b print:mt-[12pt] print:block" />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

const STEPS = [
  "Email the date and price questions first. Meet only the vendors who can do our Thursday at a price that fits.",
  "Print the interview and bring it to the meeting. Write the answers on it as you go.",
  "Then answer each question on the vendor's page, so we both see the same answers. Every vendor we add gets these questions.",
  "Don't sign until every contract and payment question has a written answer.",
];

export default async function InterviewGuidePage({ searchParams }: PageProps<"/vendors/questions">) {
  await requireSession();
  const raw = (await searchParams).category;
  const pick = Array.isArray(raw) ? raw[0] : raw;
  const category = isVendorCategory(pick) && pick !== "OTHER" ? pick : null;
  const { settings, today, vendorCount, vendors } = await loadInterviewGuide(category);

  const topics = category ? guideFor(category) : FOR_EVERY_VENDOR;
  const questionCount = topics.reduce((sum, t) => sum + t.questions.length, 0);
  const label = category ? VENDOR_CATEGORY_LABEL[category] : null;

  return (
    <div className="guide-print grid gap-8 sm:gap-10 print:gap-0">
      <style>{PRINT_CSS}</style>

      <div className="grid gap-8 sm:gap-10 print:hidden">
        <PageTitle
          lead="Questions"
          word="to ask"
          eyebrow="The interview guide"
          intro={`What a full-service planner asks every vendor before anything is signed, written for our Thursday in Holy Week at ${settings.venueName}. Pick a vendor to see the whole interview in order, then print it for the meeting.`}
          actions={
            <>
              <Link href="/vendors" className={buttonClass("secondary")}>
                Our vendors
              </Link>
              <PrintButton />
            </>
          }
        />

        {/* Phones get a short menu; wider screens see every kind at once. */}
        <details className="group rounded-[3px] border border-rule-strong bg-paper sm:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="grid gap-0.5">
              <span className="label-caps text-[10px]">Questions for</span>
              <span className="text-[15px]">{label ?? "Every vendor"}</span>
            </span>
            <Icon name="arrow" size={16} className="rotate-90 text-rose-ink transition-transform group-open:-rotate-90" />
          </summary>
          <nav aria-label="Kind of vendor" className="grid border-t border-rule py-1">
            {[null, ...GUIDE_CATEGORIES].map((c) => (
              <Link
                key={c ?? "all"}
                href={c ? `/vendors/questions?category=${c}` : "/vendors/questions"}
                aria-current={category === c ? "true" : undefined}
                className={`px-4 py-2.5 text-[14.5px] ${category === c ? "bg-ivory font-medium text-chocolate" : "text-cocoa"}`}
              >
                {c ? VENDOR_CATEGORY_LABEL[c] : "Every vendor"}
              </Link>
            ))}
          </nav>
        </details>
        <nav aria-label="Kind of vendor" className="-mx-1 hidden flex-wrap gap-1.5 sm:flex">
          {[null, ...GUIDE_CATEGORIES].map((c) => (
            <Link
              key={c ?? "all"}
              href={c ? `/vendors/questions?category=${c}` : "/vendors/questions"}
              aria-current={category === c ? "true" : undefined}
              className={`${chip} ${category === c ? chipOn : chipOff}`}
            >
              {c ? VENDOR_CATEGORY_LABEL[c] : "Every vendor"}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] print:block">
        <Card
          as="article"
          aria-labelledby="guide-h"
          className="grid gap-8 px-6 py-8 sm:px-10 sm:py-10 print:gap-5 print:border-0 print:bg-white print:p-0"
        >
          <header className="print-rule grid gap-2 border-b border-rule-strong pb-6 print:pb-3">
            <p className="label-caps text-rose-ink print:text-[7.5pt]">{category ? "The interview" : "Asked of every vendor"}</p>
            <h2 id="guide-h" className="text-[38px] leading-none sm:text-[48px] print:text-[24pt]">
              {label ? <em className="italic">{label}</em> : <>The first <em className="italic">conversation</em></>}
            </h2>
            <p className="mt-1 text-[12px] tracking-[0.16em] text-cocoa uppercase print:text-[8pt]">
              {settings.partnerOneName} &amp; {settings.partnerTwoName} · {formatDate(settings.weddingDate, "weekday-long")} · {settings.venueName}
            </p>
            <p className="num text-[13px] text-muted print:text-[8.5pt]">
              {questionCount} questions in {topics.length} parts
              <span className="hidden print:inline"> · printed {formatDate(today, "medium")}</span>
            </p>
          </header>
          <Interview topics={topics} />
          {category === null ? (
            <p className="text-sm text-muted print:hidden">
              Each kind of vendor has its own questions as well. Pick one above, or below, to see its whole interview.
            </p>
          ) : null}
        </Card>

        <aside className="grid gap-5 print:hidden" aria-label="Using the guide">
          {category && label ? (
            <Card className="grid gap-4 p-6" aria-labelledby="ours-h">
              <CardHeading id="ours-h" title={`Our ${label.toLowerCase()}`} />
              {vendors.length > 0 ? (
                <ul className="grid">
                  {vendors.map((v) => (
                    <li key={v.id} className="grid gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link href={`/vendors/${v.id}#questions`} className="min-w-0 text-[15px] leading-snug hover:text-rose-ink">
                          {v.name}
                        </Link>
                        <VendorStatusBadge status={v.status} />
                      </div>
                      <p className="num text-[12.5px] text-muted">
                        {v.asked === 0 ? "No questions yet" : `${v.answered} of ${v.asked} answered`}
                        {v.missing > 0 ? ` · ${v.missing} from the guide to add` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-cocoa">Nobody on our list yet. Add one, and these questions come with them.</p>
              )}
              <div>
                <Link href={`/vendors/new?category=${category}`} className={buttonClass("secondary", "sm")}>
                  Add a vendor
                </Link>
              </div>
            </Card>
          ) : null}

          <Card className="grid gap-4 p-6" aria-labelledby="how-h">
            <CardHeading id="how-h" title="How to use it" />
            <ol className="grid gap-3.5">
              {STEPS.map((s, i) => (
                <li key={s} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
                  <span className="num font-display text-[20px] leading-none text-gold-ink italic">{i + 1}</span>
                  <p className="text-[13.5px] leading-relaxed text-cocoa">{s}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {category === null ? (
        <section aria-labelledby="by-vendor-h" className="grid gap-5 print:hidden">
          <SectionTitle id="by-vendor-h" eyebrow="By vendor" lead="What to ask" word="each one" />
          <ul className="grid gap-px overflow-hidden rounded-[3px] border border-rule bg-paper sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE_CATEGORIES.map((c) => {
              const count = vendorCount.get(c) ?? 0;
              return (
                <li key={c} className="grid bg-paper shadow-[0_0_0_1px_var(--color-rule)]">
                  <Link href={`/vendors/questions?category=${c}`} className="group grid content-start gap-2 px-5 py-5 transition-colors hover:bg-ivory/50">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-[23px] leading-tight">{VENDOR_CATEGORY_LABEL[c]}</span>
                      <span className="num text-[12px] whitespace-nowrap text-muted">{standardQuestions(c).length} questions</span>
                    </span>
                    <span className="text-[13px] leading-relaxed text-cocoa">
                      {particularTo(c)
                        .map((t) => t.topic)
                        .join(" · ")}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="text-muted">{count === 0 ? "None on our list yet" : `${count} on our list`}</span>
                      <span className="inline-flex items-center gap-1 text-rose-ink group-hover:text-chocolate">
                        Open
                        <Icon name="arrow" size={13} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
