import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadCalendarPage } from "@/lib/data/pages";
import { daysBetween, formatDate, relativeDays } from "@/lib/dates";
import { groupByMonth, type AgendaKind } from "@/lib/domain/agenda";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Calendar" };

const KIND: Record<AgendaKind, { label: string; dot: string }> = {
  milestone: { label: "Milestone", dot: "bg-desert-rose" },
  payment: { label: "Payment", dot: "bg-gold" },
  event: { label: "Appointment", dot: "bg-garden" },
  task: { label: "Task", dot: "border border-desert-rose bg-paper" },
};

export default async function CalendarPage() {
  const { today, items, weddingDate } = await loadCalendarPage();
  const months = groupByMonth(items);

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Calendar"
        eyebrow="Plan"
        intro="Every appointment, payment and deadline between now and the wedding, in one place."
      />

      <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Key">
        {(Object.keys(KIND) as AgendaKind[]).map((k) => (
          <li key={k} className="flex items-center gap-2 text-[13px] text-cocoa">
            <span aria-hidden className={`size-2.5 rounded-full ${KIND[k].dot}`} />
            {KIND[k].label}
          </li>
        ))}
      </ul>

      <div className="grid gap-5">
        {months.map((m) => {
          const [monthName, year] = m.label.split(" ");
          return (
            <Card key={m.key} as="section" aria-label={m.label} className="grid gap-2 p-6 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8 sm:p-8">
              <h2 className="leading-none">
                <span className="font-display text-[30px] italic">{monthName}</span>
                <span className="label-caps mt-1.5 block text-[10px]">{year}</span>
              </h2>
              <ol className="grid">
                {m.items.map((item) => {
                  const isWedding = item.date === weddingDate;
                  const kind = KIND[item.kind];
                  const days = daysBetween(today, item.date);
                  return (
                    <li
                      key={item.id}
                      className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-rule py-3.5 first:pt-1 last:border-b-0 ${
                        isWedding ? "-mx-3 rounded-[3px] bg-linen/60 px-3 ring-1 ring-gold/40" : ""
                      }`}
                    >
                      <span className="text-center leading-none">
                        <span className="label-caps block text-[10px]">{formatDate(item.date, "weekday-short")}</span>
                        <span className="num mt-1 block font-display text-[26px]">{Number(item.date.slice(8))}</span>
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="flex items-start gap-2.5">
                          <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${kind.dot}`} />
                          <span className="min-w-0">
                            <span className={`block text-[15px] leading-snug ${isWedding ? "font-display text-xl" : ""}`}>{item.title}</span>
                            <span className="block text-xs text-muted">
                              {kind.label}
                              {item.detail ? ` · ${item.detail}` : ""}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="pt-0.5 text-right">
                        {item.amountCents != null ? <span className="num block text-sm">{formatCents(item.amountCents)}</span> : null}
                        {days <= 30 ? (
                          <span className={`block text-[10px] font-semibold tracking-[0.1em] uppercase ${days < 0 ? "text-brick" : "text-gold-ink"}`}>
                            {relativeDays(days)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })}
      </div>

      <ComingSoon
        phase={3}
        items={[
          "Add tastings, fittings and meetings",
          "Month view, with this list as the default on phones",
          "A milestone timeline, and a private link so it shows up in our phone calendars",
        ]}
      />
    </div>
  );
}
