import { notFound } from "next/navigation";
import { DecisionForm } from "@/components/decisions/DecisionForm";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadDecision, loadDecisionOptions } from "@/lib/data/decisions";
import { formatDate } from "@/lib/dates";
import { deleteDecision, saveDecision } from "../actions";

export const metadata = { title: "Edit decision" };

export default async function EditDecisionPage({ params }: PageProps<"/decisions/[id]">) {
  const { id } = await params;
  const [d, { vendors, budgetItems }] = await Promise.all([loadDecision(id), loadDecisionOptions()]);
  if (!d) notFound();

  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href="/decisions">Decisions</BackLink>
      <PageTitle lead="Edit the" word="decision" eyebrow="Decisions" intro={`${d.title}, decided ${formatDate(d.decidedOn, "long")}.`} />
      <Card className="p-6 sm:p-9">
        <DecisionForm
          action={saveDecision.bind(null, d.id)}
          values={{
            decidedOn: d.decidedOn,
            title: d.title,
            decision: d.decision,
            rationale: d.rationale ?? "",
            decidedBy: d.decidedBy,
            vendorId: d.vendor?.id ?? "",
            budgetItemId: d.budgetItem?.id ?? "",
          }}
          vendors={vendors}
          budgetItems={budgetItems}
          submitLabel="Save decision"
        />
      </Card>
      <section aria-labelledby="delete-h" className="flex flex-wrap items-center justify-between gap-4 rounded-[3px] border border-dashed border-rule-strong px-5 py-4 sm:px-6">
        <div className="grid gap-0.5">
          <h2 id="delete-h" className="label-caps">
            Delete this decision
          </h2>
          <p className="text-[13px] text-muted">It comes off the log for good. This can&apos;t be undone.</p>
        </div>
        <ConfirmButton action={deleteDecision.bind(null, d.id)} question="Delete this decision?">
          Delete decision
        </ConfirmButton>
      </section>
    </div>
  );
}
