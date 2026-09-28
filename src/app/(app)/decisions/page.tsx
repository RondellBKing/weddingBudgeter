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
    <div className="grid gap-10">
      <PageTitle word="Decisions" />
      <ol className="grid border-b border-rule">
        {decisions.map((d) => (
          <li key={d.id} className="grid gap-1 border-t border-rule py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
            <span className="num text-[13px] text-cocoa">{formatDate(fromDbDate(d.decidedOn), "medium")}</span>
            <div className="grid gap-1">
              <h2 className="font-sans text-base font-medium">{d.title}</h2>
              <p className="text-cocoa">{d.decision}</p>
              {d.rationale ? <p className="text-sm text-muted">Why: {d.rationale}</p> : null}
              <p className="label-caps mt-1">{WHO[d.decidedBy]}</p>
            </div>
          </li>
        ))}
      </ol>
      <ComingSoon phase={3} items={["Add, edit and link decisions to vendors and budget items"]} />
    </div>
  );
}
