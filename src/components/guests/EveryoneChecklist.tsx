import Link from "next/link";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/form/SubmitButton";
import type { CouplePartnerCheck, PartyCheck } from "@/lib/domain/guests";
import { CheckMark } from "./bits";

function Item({ ok, title, children }: { ok: boolean; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckMark ok={ok} label={ok ? "Done" : "Needs a look"} />
      <div className="grid min-w-0 content-start gap-1">
        <p className="text-[15px] leading-snug">{title}</p>
        <div className="grid gap-2 text-[13px] leading-relaxed text-cocoa">{children}</div>
      </div>
    </li>
  );
}

function names(list: string[]) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The venue's included count covers everyone eating, the couple and the attendants included,
 * so the list is only right when they're on it. Vendor meals come from vendors, not guest rows.
 */
export function EveryoneChecklist({
  couple,
  party,
  vendorMeals,
  vendorMealsCount,
  addCouple,
  compact = false,
}: {
  couple: CouplePartnerCheck[];
  party: PartyCheck;
  /** Vendor meals from booked vendors. */
  vendorMeals: number;
  /** Whether the setting counts them toward the headcount. */
  vendorMealsCount: boolean;
  /** Server Action that adds whoever of the couple is missing. Omit to show advice instead. */
  addCouple?: () => Promise<void>;
  compact?: boolean;
}) {
  const missing = couple.filter((c) => !c.onList);
  const byNameOnly = couple.filter((c) => c.onList && !c.markedAsCouple && c.guestName !== c.partner);
  const unnamed = party.total - party.named;
  const notFound = party.members.filter((m) => m.name && !m.guestName).map((m) => m.name!);

  return (
    <ul className={`grid gap-5 ${compact ? "" : "md:grid-cols-3 md:gap-8"}`}>
      <Item ok={missing.length === 0} title={missing.length === 0 ? "The two of you are on the list" : `${names(missing.map((m) => m.partner))} ${missing.length === 1 ? "isn't" : "aren't"} on the list`}>
        {missing.length === 0 ? (
          <p>
            {byNameOnly.length > 0
              ? `${byNameOnly.map((c) => `${c.partner} as “${c.guestName}”`).join(" and ")}. `
              : ""}
            You count toward the venue&apos;s included headcount like everyone else.
          </p>
        ) : (
          <>
            <p>The venue&apos;s included headcount counts the two of you, so you belong on the list too.</p>
            {addCouple ? (
              <form action={addCouple}>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Adding…">
                  {missing.length === 2 ? "Add the two of us" : `Add ${missing[0].partner}`}
                </SubmitButton>
              </form>
            ) : (
              <p className="text-muted">After the import, add yourselves from the guest list in one click.</p>
            )}
          </>
        )}
      </Item>

      <Item
        ok={party.total > 0 && party.found === party.total}
        title={
          party.total === 0
            ? "No wedding party yet"
            : party.found === party.total
              ? `All ${party.total} of the wedding party are on the list`
              : `${party.found} of ${party.total} in the wedding party found on the list`
        }
      >
        {party.found < party.total ? (
          <>
            {unnamed > 0 ? (
              <p>
                {unnamed === 1 ? "One attendant doesn't" : `${unnamed} attendants don't`} have a name in the app yet, so
                we can&apos;t look for them.{" "}
                <Link href="/party" className="text-rose-ink underline-offset-4 hover:underline">
                  Wedding party
                </Link>
              </p>
            ) : null}
            {notFound.length > 0 ? <p>Not found by name: {names(notFound)}.</p> : null}
          </>
        ) : (
          <p>Attendants eat too, so they count toward the headcount.</p>
        )}
      </Item>

      <Item ok title={vendorMeals === 0 ? "No vendor meals yet" : `${vendorMeals} vendor ${vendorMeals === 1 ? "meal" : "meals"}`}>
        <p>
          {vendorMeals === 0
            ? "Meals for booked vendors are added from each vendor, not from guest rows."
            : vendorMealsCount
              ? "Added to the headcount from booked vendors. They aren't guest rows, so don't add them here."
              : "Booked vendors need them, but the settings say vendor meals don't count toward the headcount."}
        </p>
      </Item>
    </ul>
  );
}
