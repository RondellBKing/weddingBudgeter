import Link from "next/link";
import { Tag } from "@/components/guests/bits";
import { Card } from "@/components/ui/Card";
import { ToneBadge } from "@/components/ui/Tone";
import type { HotelView } from "@/lib/data/travel";
import { formatDate, type CalendarDate } from "@/lib/dates";
import { cutoffCountdown, cutoffStatus, nights } from "@/lib/domain/travel";
import { displayUrl, telHref } from "@/lib/domain/vendor-contact";
import type { UrgencyLevel } from "@/lib/domain/deadlines";
import { formatCents } from "@/lib/money";

// One hotel block. The cutoff date is the deadline that matters: the card leans on it harder
// as it gets close (a heavier top rule, a gold then brick figure), always with a word.

const EDGE: Record<UrgencyLevel, string> = {
  calm: "",
  "90": "border-t-2 border-t-dusty-rose",
  "60": "border-t-2 border-t-dusty-rose",
  "30": "border-t-[3px] border-t-gold",
  "14": "border-t-[3px] border-t-gold",
  "7": "border-t-[5px] border-t-gold",
  overdue: "border-t-[3px] border-t-brick",
};

const FIGURE: Record<UrgencyLevel, string> = {
  calm: "",
  "90": "",
  "60": "",
  "30": "text-gold-ink",
  "14": "text-gold-ink",
  "7": "text-gold-ink",
  overdue: "text-brick",
};

/** "https://www.hotel.com/groups?id=…" → "hotel.com": group links are long. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return displayUrl(url);
  }
}

function Fact({ label, children, muted = false }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className="label-caps text-[10px]">{label}</dt>
      <dd className={`num text-[15px] leading-snug break-words ${muted ? "text-muted" : ""}`}>{children}</dd>
    </div>
  );
}

function Cutoff({ cutoff, today }: { cutoff: CalendarDate | null; today: CalendarDate }) {
  if (!cutoff) {
    return (
      <div className="grid gap-1.5 border-y border-rule py-4">
        <ToneBadge tone="neutral">No cutoff date yet</ToneBadge>
        <p className="text-[13px] text-cocoa">Ask the hotel the last day guests can book at the group rate, and add it here.</p>
      </div>
    );
  }
  const s = cutoffStatus(cutoff, today);
  const c = cutoffCountdown(s.daysLeft);
  return (
    <div className="grid gap-x-6 gap-y-3 border-y border-rule py-4 min-[420px]:grid-cols-[auto_minmax(0,1fr)] min-[420px]:items-center">
      <div className="grid justify-items-start gap-1">
        <span className={`num font-display text-[48px] leading-[0.85] ${FIGURE[s.level]}`}>{c.figure}</span>
        <span className="label-caps text-[10px]">{c.caption}</span>
      </div>
      <div className="grid gap-1.5">
        <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
        <p className="text-[15px]">
          {s.daysLeft < 0 ? "Group rate ended" : "Group rate until"} <span className="num">{formatDate(cutoff, "weekday-medium")}</span>
        </p>
        <p className="text-[13px] leading-relaxed text-cocoa">{s.message}</p>
      </div>
    </div>
  );
}

export function HotelCard({ hotel: h, today }: { hotel: HotelView; today: CalendarDate }) {
  const level = h.cutoffDate ? cutoffStatus(h.cutoffDate, today).level : "calm";
  const stay = nights(h.checkIn, h.checkOut);
  return (
    <Card as="article" aria-labelledby={`hotel-${h.id}`} className={`@container grid content-start gap-5 p-6 sm:p-7 ${EDGE[level]}`}>
      <div className="grid gap-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-caps text-rose-ink">Hotel block</span>
          {h.isDemo ? <Tag tone="demo">Demo</Tag> : null}
        </p>
        <h3 id={`hotel-${h.id}`} className="text-[28px] leading-[1.1]">
          {h.name}
        </h3>
        {h.address ? <p className="text-sm text-cocoa">{h.address}</p> : null}
        {h.phone || h.bookingUrl ? (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {h.phone ? (
              <a href={telHref(h.phone)} className="num text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
                {h.phone}
              </a>
            ) : null}
            {h.bookingUrl ? (
              <a
                href={h.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 break-all text-rose-ink underline-offset-4 hover:text-chocolate hover:underline"
              >
                Booking link<span className="text-muted"> · {hostOf(h.bookingUrl)}</span>
              </a>
            ) : null}
          </p>
        ) : null}
      </div>

      <Cutoff cutoff={h.cutoffDate} today={today} />

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 @xl:grid-cols-4">
        <Fact label="Group code" muted={!h.groupCode}>
          {h.groupCode ?? "None"}
        </Fact>
        <Fact label="Rooms held" muted={h.roomsHeld === null}>
          {h.roomsHeld ?? "Not set"}
        </Fact>
        <Fact label="Per night" muted={h.nightlyRateCents === null}>
          {h.nightlyRateCents !== null ? formatCents(h.nightlyRateCents) : "Not set"}
        </Fact>
        <Fact label="Stay" muted={!h.checkIn && !h.checkOut}>
          {h.checkIn || h.checkOut ? (
            <>
              {h.checkIn ? formatDate(h.checkIn, "month-day") : "?"} to {h.checkOut ? formatDate(h.checkOut, "month-day") : "?"}
              {stay ? <span className="block text-xs text-muted">{stay === 1 ? "1 night" : `${stay} nights`}</span> : null}
            </>
          ) : (
            "Not set"
          )}
        </Fact>
      </dl>

      {h.vendor || h.notes ? (
        <div className="grid gap-2 text-sm">
          {h.vendor ? (
            <p className="text-cocoa">
              Vendor:{" "}
              <Link href={`/vendors/${h.vendor.id}`} className="text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
                {h.vendor.name}
              </Link>
            </p>
          ) : null}
          {h.notes ? <p className="whitespace-pre-line text-cocoa">{h.notes}</p> : null}
        </div>
      ) : null}

      <div className="border-t border-rule pt-4">
        <Link href={`/travel/hotels/${h.id}`} className="text-[13px] text-rose-ink underline-offset-4 hover:text-chocolate hover:underline">
          Edit<span className="sr-only"> {h.name}</span>
        </Link>
      </div>
    </Card>
  );
}
