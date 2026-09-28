import Link from "next/link";
import { ImportWizard } from "@/components/guests/import/ImportWizard";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadLastImport } from "@/lib/data/guests";
import { loadPlan } from "@/lib/data/plan";
import { formatInstant } from "@/lib/dates";

export const metadata = { title: "Import guests" };

export default async function ImportGuestsPage() {
  const [plan, last] = await Promise.all([loadPlan(), loadLastImport()]);
  const lastImport = last
    ? {
        when: formatInstant(last.at, plan.settings.timezone, { month: "long", day: "numeric", year: "numeric" }),
        fileName: last.fileName,
      }
    : null;

  return (
    <div className="grid gap-8 sm:gap-10">
      <div className="grid gap-4">
        <Link href="/guests" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          All guests
        </Link>
        <PageTitle
          lead="Import the"
          word="guest list"
          eyebrow="Guests"
          intro="From the RSVP app's CSV export. You'll see exactly what would change, and what it does to the headcount, before anything is saved."
        />
      </div>
      <ImportWizard saved={last?.mapping ?? null} lastImport={lastImport} />
    </div>
  );
}
