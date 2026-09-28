import { Card } from "@/components/ui/Card";
import { ToneBadge } from "@/components/ui/Tone";
import { formatDate, type CalendarDate } from "@/lib/dates";
import type { SizingUrgency } from "@/lib/domain/party-sizing";

// The Nov 7 deadline. It stays quiet while there's time and leans harder at 90, 60, 30, 14 and
// 7 days out, then turns brick once it has passed with sizes still missing.

function look(u: SizingUrgency) {
  const e = u.emphasis;
  return {
    card:
      e >= 6
        ? "border-t-[5px] border-t-brick"
        : e >= 5
          ? "border-t-[5px] border-t-gold"
          : e >= 3
            ? "border-t-[3px] border-t-gold"
            : e >= 1
              ? "border-t-2 border-t-dusty-rose"
              : "",
    number: e >= 6 ? "text-brick" : e >= 3 ? "text-gold-ink" : "",
    message:
      e >= 6
        ? "text-[17px] font-medium text-brick"
        : e >= 5
          ? "text-[17px] font-medium text-chocolate"
          : e >= 3
            ? "text-base font-medium text-chocolate"
            : e >= 1
              ? "text-[15px] text-chocolate"
              : "text-[15px] text-cocoa",
  };
}

export function DeadlineCard({
  deadline,
  urgency,
  dresses,
  suits,
}: {
  deadline: CalendarDate;
  urgency: SizingUrgency;
  /** People in dresses, and how many still owe a style or sizes. */
  dresses: { owing: number; total: number };
  /** People in suits, and how many still owe measurements. */
  suits: { owing: number; total: number };
}) {
  const s = look(urgency);
  const overdue = urgency.daysLeft < 0;
  return (
    <Card
      framed
      aria-labelledby="deadline-h"
      className={`grid gap-6 px-7 py-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:px-10 ${s.card}`}
    >
      <div className="relative grid justify-items-start gap-1">
        <span className={`num font-display text-[72px] leading-[0.85] ${s.number}`}>
          {Math.abs(urgency.daysLeft).toLocaleString("en-US")}
        </span>
        <span className="label-caps">{overdue ? (urgency.daysLeft === -1 ? "day overdue" : "days overdue") : urgency.daysLeft === 1 ? "day left" : "days left"}</span>
      </div>
      <div className="relative grid gap-3">
        <ToneBadge tone={urgency.tone}>{urgency.label}</ToneBadge>
        <h2 id="deadline-h" className="text-2xl leading-snug sm:text-[28px]">
          Dress selection &amp; sizing {overdue ? "were" : "are"} due{" "}
          <em className="italic">{formatDate(deadline, "weekday-long")}</em>
        </h2>
        <p className={`leading-relaxed ${s.message}`}>{urgency.message}</p>
        <p className="text-sm text-muted">
          Every attendant sends their choice and sizes to the bride, who orders all the dresses after that date.
          Alterations are each person&apos;s own cost.
        </p>
        <dl className="mt-1 flex flex-wrap gap-x-10 gap-y-3 border-t border-rule pt-4">
          <div className="grid gap-1">
            <dt className="label-caps text-[10px]">Dresses still owed</dt>
            <dd className="num font-display text-[28px] leading-none">
              {dresses.owing} <span className="font-sans text-sm text-muted">of {dresses.total}</span>
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="label-caps text-[10px]">Suit measurements still owed</dt>
            <dd className="num font-display text-[28px] leading-none">
              {suits.owing} <span className="font-sans text-sm text-muted">of {suits.total}</span>
            </dd>
          </div>
          {!urgency.allIn ? (
            <div className="grid content-end">
              <a href="#sizing" className="text-[13px] text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
                See who still owes sizing
              </a>
            </div>
          ) : null}
        </dl>
      </div>
    </Card>
  );
}
