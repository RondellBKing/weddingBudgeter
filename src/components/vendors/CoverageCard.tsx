import Link from "next/link";
import { Fragment } from "react";
import { Card, CardHeading } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { ToneBadge } from "@/components/ui/Tone";
import { vendorListHref, type CoverageRow } from "@/lib/domain/vendors";

const linkClass = "text-rose-ink underline-offset-4 hover:text-chocolate hover:underline";

/**
 * Every category, booked or not: the empty ones are the point. A vendor that also covers a
 * category (an all-inclusive venue covering catering) counts as booked for it.
 */
export function CoverageCard({ rows }: { rows: CoverageRow[] }) {
  const bookedCount = rows.filter((r) => r.booked.length > 0).length;
  return (
    <Card className="grid gap-5 p-6 sm:p-7" aria-labelledby="coverage-h">
      <CardHeading id="coverage-h" title="Who we still need" />
      <Meter
        label="Categories booked"
        value={bookedCount}
        max={rows.length}
        detail={`${bookedCount} of ${rows.length}`}
        fill="bg-garden"
      />
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => {
          const done = c.bookedVendors.length > 0;
          return (
            <li key={c.category} className={`grid content-start gap-1 px-4 py-3.5 ${done ? "bg-paper" : "bg-ivory/60"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px]">{c.label}</span>
                {done ? (
                  <ToneBadge tone="on-track">Booked</ToneBadge>
                ) : (
                  <span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Needed</span>
                )}
              </div>
              <p className="min-w-0 text-xs text-muted">
                {done ? (
                  c.bookedVendors.map((v, i) => (
                    <Fragment key={`${v.id ?? v.name}-${i}`}>
                      {i > 0 ? ", " : null}
                      {v.id ? (
                        <Link href={`/vendors/${v.id}`} className={linkClass}>
                          {v.name}
                        </Link>
                      ) : (
                        v.name
                      )}
                      {v.via === "also" ? " (included)" : null}
                    </Fragment>
                  ))
                ) : c.inProgress > 0 ? (
                  <Link href={vendorListHref({ category: c.category })} className={linkClass}>
                    {c.inProgress} in conversation
                  </Link>
                ) : (
                  <>
                    Not started ·{" "}
                    <Link href={`/vendors/new?category=${c.category}`} className={linkClass}>
                      Add one
                    </Link>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
