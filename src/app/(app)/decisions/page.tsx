import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";
import { formatDate, fromDbDate } from "@/lib/dates";
import { prisma } from "@/lib/db";

export const metadata = { title: "Decisions" };

const WHO = { RONDELL: "Rondell", CAPRI: "Capri", BOTH: "Both of us" } as const;

export default async function DecisionsPage() {
  await requireSession();
  const decisions = await prisma.decision.findMany({ orderBy: [{ decidedOn: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Decisions"
        eyebrow="Plan"
        intro="Our own paper trail: what we chose, when, and why."
      />
      <Card className="px-6 sm:px-9">
        <ol className="grid">
          {decisions.map((d) => (
            <li key={d.id} className="grid gap-2 border-b border-rule py-7 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
              <p className="leading-none">
                <span className="font-display text-[26px] italic">{formatDate(fromDbDate(d.decidedOn), "month-day")}</span>
                <span className="label-caps mt-1.5 block text-[10px]">{fromDbDate(d.decidedOn).slice(0, 4)}</span>
              </p>
              <div className="grid gap-1.5">
                <h2 className="font-display text-2xl leading-snug">{d.title}</h2>
                <p className="max-w-prose text-cocoa">{d.decision}</p>
                {d.rationale ? <p className="text-sm text-muted">Why: {d.rationale}</p> : null}
                <p className="label-caps mt-1 text-[10px] text-rose-ink">Decided by {WHO[d.decidedBy].toLowerCase()}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
      <ComingSoon phase={3} items={["Add and edit decisions, linked to vendors and budget items"]} />
    </div>
  );
}
