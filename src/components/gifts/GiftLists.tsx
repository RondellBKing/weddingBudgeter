import Link from "next/link";
import { markThankYouSent } from "@/app/(app)/gifts/actions";
import { SubmitButton } from "@/components/form/SubmitButton";
import { Tag } from "@/components/guests/bits";
import { ToneBadge } from "@/components/ui/Tone";
import type { GiftView } from "@/lib/data/gifts";
import { formatDate } from "@/lib/dates";
import { THANK_YOU_STATE, waitedLabel, type OwedGift } from "@/lib/domain/gifts";

/** Who it's from, and the guest it's linked to when the names differ. */
function From({ g }: { g: GiftView }) {
  return (
    <div className="grid gap-0.5">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[16px]">{g.fromName}</span>
        {g.isDemo ? <Tag tone="demo">Demo</Tag> : null}
      </p>
      {g.guest && g.guest.fullName !== g.fromName ? (
        <p className="text-[12px] text-muted">
          On the guest list as{" "}
          <Link href={`/guests/${g.guest.id}`} className="text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
            {g.guest.fullName}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Oldest first, each with how long it has waited and a one-tap "sent today". */
export function ThankYouList({ owed }: { owed: Array<OwedGift<GiftView>> }) {
  return (
    <ul className="border-t border-rule">
      {owed.map((g) => {
        const s = THANK_YOU_STATE[g.state];
        return (
          <li key={g.id} className="grid gap-3 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
            <div className="grid min-w-0 gap-1">
              <From g={g} />
              <p className="text-[14px] text-cocoa">{g.description}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                <span className="num">{waitedLabel(g.waitedDays)}</span>
                <span aria-hidden>·</span>
                <span className="num">Arrived {formatDate(g.receivedOn, "medium")}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
                <span className="num">
                  {g.daysLeft < 0 ? "Aim was" : "Aim for"} {formatDate(g.writeBy, "month-day")}
                </span>
              </p>
            </div>
            <form action={markThankYouSent.bind(null, g.id)}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…" className="w-full sm:w-auto">
                Thank-you sent today
                <span className="sr-only"> for {g.fromName}</span>
              </SubmitButton>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

/** Every gift, newest first. Rows stack on phones. */
export function GiftLog({ gifts }: { gifts: GiftView[] }) {
  return (
    <ol className="grid">
      {gifts.map((g) => (
        <li
          key={g.id}
          className="grid gap-x-8 gap-y-2 border-b border-rule py-5 last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-baseline"
        >
          <p className="leading-none">
            <span className="font-display text-[22px] italic">{formatDate(g.receivedOn, "month-day")}</span>
            <span className="label-caps ml-2 text-[10px] sm:mt-1 sm:ml-0 sm:block">{g.receivedOn.slice(0, 4)}</span>
          </p>
          <div className="grid min-w-0 gap-1">
            <From g={g} />
            <p className="text-[14px] text-cocoa">{g.description}</p>
            {g.notes ? <p className="text-[13px] whitespace-pre-line text-muted">{g.notes}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 sm:justify-end">
            {g.thankYouSentOn ? (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <ToneBadge tone="on-track">Thanked</ToneBadge>
                <span className="num text-[12px] text-muted">{formatDate(g.thankYouSentOn, "month-day")}</span>
              </span>
            ) : (
              <ToneBadge tone="due-soon">To write</ToneBadge>
            )}
            <Link href={`/gifts/${g.id}`} className="text-[13px] text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
              Edit<span className="sr-only"> the gift from {g.fromName}</span>
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
