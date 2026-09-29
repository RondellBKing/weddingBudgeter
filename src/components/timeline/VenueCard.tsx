import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ToneBadge } from "@/components/ui/Tone";
import { formatClockTime } from "@/lib/dates";
import { vendorsMissingArrival, type ArrivalVendor } from "@/lib/domain/timeline";

const linkClass = "text-rose-ink underline-offset-4 hover:text-chocolate hover:underline";

/** The facts the day hangs on: where, when vendors can get in, when the ceremony starts. */
export function VenueCard({
  venueName,
  venueAddress,
  venueAccessTime,
  ceremonyTime,
  vendors,
  className = "",
}: {
  venueName: string;
  venueAddress: string;
  venueAccessTime: string;
  ceremonyTime: string | null;
  vendors: ArrivalVendor[];
  className?: string;
}) {
  const missing = vendorsMissingArrival(vendors);
  const expected = vendors.filter((v) => v.status === "BOOKED" && v.category !== "VENUE" && v.category !== "LODGING");
  return (
    <Card className={`grid content-start gap-5 p-6 sm:p-8 ${className}`} aria-labelledby="venue-h">
      <CardHeading id="venue-h" title="On the day" />
      <div className="grid gap-1">
        <p className="font-display text-[24px] leading-tight">{venueName}</p>
        <p className="text-[14px] text-cocoa">{venueAddress}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-5">
        <div className="grid content-start gap-1">
          <dt className="label-caps text-[10px]">Vendors from</dt>
          <dd className="num font-display text-[24px] leading-none">{formatClockTime(venueAccessTime)}</dd>
        </div>
        <div className="grid content-start gap-1">
          <dt className="label-caps text-[10px]">Ceremony</dt>
          <dd>
            {ceremonyTime ? (
              <span className="num font-display text-[24px] leading-none">{formatClockTime(ceremonyTime)}</span>
            ) : (
              <Link href="/settings" className={`text-[14px] ${linkClass}`}>
                Not set yet
              </Link>
            )}
          </dd>
        </div>
      </dl>
      {expected.length > 0 ? (
        <div className="grid gap-1.5 border-t border-rule pt-5 text-[13px] text-cocoa">
          {missing.length === 0 ? (
            <ToneBadge tone="on-track">Every arrival time is set</ToneBadge>
          ) : (
            <>
              <ToneBadge tone="due-soon">
                {missing.length} {missing.length === 1 ? "vendor has" : "vendors have"} no arrival time
              </ToneBadge>
              <p>
                {missing.map((v, i) => (
                  <span key={v.id}>
                    {i > 0 ? ", " : null}
                    <Link href={`/vendors/${v.id}/edit`} className={linkClass}>
                      {v.name}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
        </div>
      ) : null}
      <Link href="/timeline/print" className={`${buttonClass("secondary", "sm")} justify-self-start`}>
        <Icon name="timeline" size={15} />
        Open the day-of binder
      </Link>
    </Card>
  );
}
