import Link from "next/link";
import { SubmitButton } from "@/components/form/SubmitButton";
import { MemberAvatar } from "@/components/party/MemberAvatar";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ToneBadge, type Tone } from "@/components/ui/Tone";
import type { MemberView } from "@/lib/data/party";
import { formatDate, type CalendarDate } from "@/lib/dates";
import { ROLE_LABEL, telHref } from "@/lib/domain/party";
import {
  owedLabel,
  SIZING_STAGE_LABEL,
  SIZING_STAGES,
  type RollupRow,
  type SizingUrgency,
} from "@/lib/domain/party-sizing";
import { markSizingReceived } from "./actions";

type Row = RollupRow<MemberView>;

/** Little segments for asked → said yes → style → sizes, filled as each one happens. */
function Progress({ m }: { m: Row }) {
  const steps =
    m.outfitType === "DRESS"
      ? [Boolean(m.askedOn || m.acceptedOn), Boolean(m.acceptedOn), Boolean(m.chosenStyleId), Boolean(m.sizingSubmittedOn)]
      : [Boolean(m.askedOn || m.acceptedOn), Boolean(m.acceptedOn), Boolean(m.sizingSubmittedOn)];
  return (
    <span aria-hidden className="flex gap-1">
      {steps.map((done, i) => (
        <span key={i} className={`h-1 w-5 rounded-[1px] ${done ? "bg-desert-rose" : "bg-linen"}`} />
      ))}
    </span>
  );
}

function lastHeard(m: Row): string | null {
  if (m.sizingSubmittedOn) return `sizes in ${formatDate(m.sizingSubmittedOn, "month-day")}`;
  if (m.acceptedOn) return `said yes ${formatDate(m.acceptedOn, "month-day")}`;
  if (m.askedOn) return `asked ${formatDate(m.askedOn, "month-day")}`;
  return null;
}

function RollupRowItem({ m }: { m: Row }) {
  const heard = lastHeard(m);
  // Suits only ever owe measurements (their list says so); dresses can owe a style, sizes or both.
  const owes = m.outfitType === "DRESS" ? `Owes ${owedLabel(m.owed, m.outfitType).toLowerCase()}` : null;
  const meta = [owes, heard].filter(Boolean).join(" · ");
  return (
    // Container query: the button moves under the name when the list itself is narrow.
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2.5 border-b border-rule py-3 last:border-b-0 @md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <MemberAvatar m={m} size="sm" />
      <div className="grid min-w-0 gap-1 [overflow-wrap:anywhere]">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/party/${m.id}`}
            className={`hover:text-rose-ink ${m.isPlaceholder ? "font-display text-lg leading-tight italic" : "text-[15px]"}`}
          >
            {m.name}
          </Link>
          {!m.isPlaceholder ? <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span> : null}
        </p>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          <Progress m={m} />
          {meta ? <span>{meta}</span> : null}
          {m.phone ? (
            <a href={telHref(m.phone)} className="text-rose-ink underline-offset-4 hover:underline">
              Call<span className="sr-only"> {m.name}</span>
            </a>
          ) : null}
          {m.email ? (
            <a href={`mailto:${m.email}`} className="text-rose-ink underline-offset-4 hover:underline">
              Email<span className="sr-only"> {m.name}</span>
            </a>
          ) : null}
        </p>
      </div>
      <div className="col-span-2 @md:col-span-1 @md:justify-self-end">
        {m.owed.sizes ? (
          <form action={markSizingReceived.bind(null, m.id)}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…" className="w-full @md:w-auto">
              {m.outfitType === "SUIT" ? "Measurements received today" : "Sizing received today"}
              <span className="sr-only"> from {m.name}</span>
            </SubmitButton>
          </form>
        ) : (
          <Link href={`/party/${m.id}#f-chosenStyleId`} className={buttonClass("secondary", "sm", "w-full @md:w-auto")}>
            Record their style<span className="sr-only"> for {m.name}</span>
          </Link>
        )}
      </div>
    </li>
  );
}

function RollupList({ title, detail, rows, total, tone, done }: { title: string; detail: string; rows: Row[]; total: number; tone: Tone; done: string }) {
  return (
    <section className="@container grid content-start gap-3" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3 border-b border-rule-strong pb-2">
        <h3 className="font-sans text-[15px] font-medium">
          {title} <span className="font-normal text-muted">· {detail}</span>
        </h3>
        <span className="num label-caps">
          {rows.length} of {total} owe
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="flex items-center gap-2.5 py-2 text-sm text-garden-ink">
          <span aria-hidden className="grid size-5 place-items-center rounded-full bg-garden text-paper">
            <Icon name="check" size={12} strokeWidth={2.2} />
          </span>
          {done}
        </p>
      ) : (
        <div className="grid gap-4">
          {SIZING_STAGES.map((stage) => {
            const group = rows.filter((m) => m.stage === stage);
            if (group.length === 0) return null;
            return (
              <div key={stage} className="grid">
                <h4 className="flex items-center justify-between gap-3 pt-1 pb-0.5">
                  <ToneBadge tone={tone}>{SIZING_STAGE_LABEL[stage]}</ToneBadge>
                  <span className="num text-xs text-muted">{group.length}</span>
                </h4>
                <ul className="grid">
                  {group.map((m) => (
                    <RollupRowItem key={m.id} m={m} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Who still owes a dress selection or sizes (and suit measurements), furthest behind first. */
export function SizingRollup({
  deadline,
  urgency,
  dresses,
  suits,
  totals,
}: {
  deadline: CalendarDate;
  urgency: SizingUrgency;
  dresses: Row[];
  suits: Row[];
  totals: { dresses: number; suits: number };
}) {
  // The stage words stay quiet until the last month, then take the deadline's color.
  const tone: Tone = urgency.emphasis >= 3 ? urgency.tone : "neutral";
  return (
    <Card id="sizing" className="grid scroll-mt-20 gap-7 p-6 sm:p-8" aria-labelledby="rollup-h">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1.5">
          <p className="label-caps text-rose-ink">Due {formatDate(deadline, "weekday-medium")}</p>
          <h2 id="rollup-h" className="text-[28px] leading-tight sm:text-[32px]">
            Who hasn&apos;t sent <em className="italic">sizing</em>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted">
          Furthest behind first. Mark sizes received the day they reach the bride.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-9 lg:grid-cols-2 lg:gap-12">
        <RollupList
          title="Dresses"
          detail="style and sizes"
          rows={dresses}
          total={totals.dresses}
          tone={tone}
          done="Every dress style and size is in."
        />
        <RollupList
          title="Suits"
          detail="measurements"
          rows={suits}
          total={totals.suits}
          tone="neutral"
          done="Every suit measurement is in."
        />
      </div>
    </Card>
  );
}
