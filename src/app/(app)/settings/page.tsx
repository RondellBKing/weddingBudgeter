import { PageTitle } from "@/components/ui/PageTitle";
import { loadPlan } from "@/lib/data/plan";
import { formatDate } from "@/lib/dates";
import { centsToInputValue, formatCents, ppmToPercentString } from "@/lib/money";
import { logOutEverywhere } from "./actions";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { settings: s, budget } = await loadPlan();
  return (
    <div className="grid gap-14">
      <PageTitle word="Settings" />

      <section className="grid gap-3 border-y border-rule py-5 text-cocoa sm:grid-cols-3">
        <div className="grid gap-1">
          <span className="label-caps">Wedding date</span>
          <span>{formatDate(s.weddingDate, "weekday-long")}</span>
        </div>
        <div className="grid gap-1">
          <span className="label-caps">Dress sizing deadline</span>
          <span>{formatDate(s.dressSizingDeadline, "weekday-long")}</span>
        </div>
        <div className="grid gap-1">
          <span className="label-caps">Budget not assigned to a category</span>
          <span className="num">{formatCents(budget.unallocated)}</span>
        </div>
      </section>

      <SettingsForm
        values={{
          partnerOneName: s.partnerOneName,
          partnerTwoName: s.partnerTwoName,
          ceremonyTime: s.ceremonyTime ?? "",
          venueAddress: s.venueAddress,
          headcountTarget: s.headcountTarget,
          totalBudget: centsToInputValue(s.totalBudgetCents),
          includedHeadcount: s.includedHeadcount,
          perPersonOverage: centsToInputValue(s.perPersonOverageCents),
          overageTaxPercent: ppmToPercentString(s.overageTaxPpm),
          vendorMealsCountTowardHeadcount: s.vendorMealsCountTowardHeadcount,
        }}
      />

      <section className="grid gap-5 border-t border-rule pt-8" aria-labelledby="signin-h">
        <h2 id="signin-h" className="text-2xl">
          Signing <em className="italic">in</em>
        </h2>
        <div className="flex flex-wrap gap-4">
          <form action="/api/logout" method="post">
            <button type="submit" className="rounded-[2px] border border-rule-strong px-5 py-2.5 text-sm hover:border-chocolate">
              Log out on this device
            </button>
          </form>
          <form action={logOutEverywhere}>
            <button type="submit" className="rounded-[2px] border border-brick px-5 py-2.5 text-sm text-brick hover:bg-brick-wash">
              Log out everywhere
            </button>
          </form>
        </div>
        <p className="max-w-prose text-[13px] text-muted">
          Log out everywhere signs out every phone and computer, including this one, and changes the private calendar
          link. Use it if a phone is lost or the passphrase may have been shared.
        </p>
      </section>
    </div>
  );
}
