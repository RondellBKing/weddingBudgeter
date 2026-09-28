import { DecisionForm } from "@/components/decisions/DecisionForm";
import { BackLink } from "@/components/tasks/BackLink";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadDecisionOptions } from "@/lib/data/decisions";
import { loadPlan } from "@/lib/data/plan";
import { saveDecision } from "../actions";

export const metadata = { title: "Record a decision" };

export default async function NewDecisionPage() {
  const [{ today }, { vendors, budgetItems }] = await Promise.all([loadPlan(), loadDecisionOptions()]);
  return (
    <div className="grid gap-6 sm:gap-8">
      <BackLink href="/decisions">Decisions</BackLink>
      <PageTitle lead="A new" word="decision" eyebrow="Decisions" intro="What you chose and why, while it's fresh." />
      <Card className="p-6 sm:p-9">
        <DecisionForm
          action={saveDecision.bind(null, null)}
          values={{ decidedOn: today, title: "", decision: "", rationale: "", decidedBy: "BOTH", vendorId: "", budgetItemId: "" }}
          vendors={vendors}
          budgetItems={budgetItems}
          submitLabel="Save decision"
        />
      </Card>
    </div>
  );
}
