import Link from "next/link";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { Card } from "@/components/ui/Card";
import { ToneBadge } from "@/components/ui/Tone";
import type { DutyView, MemberView } from "@/lib/data/party";
import { daysBetween, dueState, formatDate, formatInstant, relativeDays, type CalendarDate } from "@/lib/dates";
import { ROLE_LABEL } from "@/lib/domain/party";
import { deleteDuty, setDutyDone } from "./actions";
import { AddDutyForm } from "./AddDutyForm";
import { DutyCheck } from "./DutyCheck";

function DueLine({ duty, today, timezone }: { duty: DutyView; today: CalendarDate; timezone: string }) {
  if (duty.done) {
    return (
      <span className="text-garden-ink">
        Done{duty.completedAt ? ` ${formatInstant(duty.completedAt, timezone, { month: "short", day: "numeric", year: "numeric" })}` : ""}
      </span>
    );
  }
  if (!duty.dueDate) return <span>No date</span>;
  const state = dueState(duty.dueDate, today, 14);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="num">Due {formatDate(duty.dueDate, "weekday-medium")}</span>
      {state !== "on-track" ? <ToneBadge tone={state}>{relativeDays(daysBetween(today, duty.dueDate))}</ToneBadge> : null}
    </span>
  );
}

export function DutyList({ duties, today, timezone }: { duties: DutyView[]; today: CalendarDate; timezone: string }) {
  // Open duties first, each group in due-date order (the loader sorts by date).
  const sorted = [...duties.filter((d) => !d.done), ...duties.filter((d) => d.done)];
  return (
    <ul className="grid">
      {sorted.map((d) => (
        <li key={d.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-rule py-3 last:border-b-0">
          <DutyCheck action={setDutyDone.bind(null, d.id, !d.done)} done={d.done} title={d.title} />
          <div className="min-w-0 flex-1 basis-40">
            <p className={d.done ? "text-muted line-through decoration-rule-strong" : "text-[15px]"}>{d.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              <DueLine duty={d} today={today} timezone={timezone} />
            </p>
          </div>
          <div className="shrink-0">
            <ConfirmButton action={deleteDuty.bind(null, d.id)} question="Delete this duty?" confirmLabel="Delete">
              Delete<span className="sr-only"> “{d.title}”</span>
            </ConfirmButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Every person's duties on /party, grouped by person, with one form to add a duty for anyone. */
export function DutiesCard({ members, today, timezone }: { members: MemberView[]; today: CalendarDate; timezone: string }) {
  const withDuties = members.filter((m) => m.duties.length > 0);
  const all = members.flatMap((m) => m.duties);
  const open = all.filter((d) => !d.done).length;
  return (
    <Card className="grid gap-6 p-6 sm:p-8" aria-labelledby="duties-h">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="grid gap-1.5">
          <p className="label-caps text-rose-ink">Who&apos;s doing what</p>
          <h2 id="duties-h" className="text-[28px] leading-tight sm:text-[32px]">
            Party <em className="italic">duties</em>
          </h2>
        </div>
        {all.length > 0 ? (
          <p className="num text-sm text-muted">
            {open} open · {all.length - open} done
          </p>
        ) : null}
      </div>

      <AddDutyForm people={members.map((m) => ({ id: m.id, name: m.isPlaceholder ? m.name : `${m.name} (${ROLE_LABEL[m.role]})` }))} />

      {withDuties.length === 0 ? (
        <p className="text-sm text-cocoa">
          No duties yet. Add the first one above, like planning the bridal shower or holding the rings.
        </p>
      ) : (
        <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
          {withDuties.map((m) => (
            <section key={m.id} aria-label={`${m.name}'s duties`} className="grid content-start gap-1">
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-rule-strong pb-2">
                <Link href={`/party/${m.id}`} className="font-display text-xl hover:text-rose-ink">
                  {m.name}
                </Link>
                {!m.isPlaceholder ? <span className="label-caps text-[10px]">{ROLE_LABEL[m.role]}</span> : null}
              </h3>
              <DutyList duties={m.duties} today={today} timezone={timezone} />
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
