import Link from "next/link";
import { EMPTY_GUEST, GuestForm } from "@/components/guests/GuestForm";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadGuestFormOptions } from "@/lib/data/guests";
import { createGuest } from "../actions";

export const metadata = { title: "Add a guest" };

export default async function NewGuestPage() {
  const { plusOneChoices, households } = await loadGuestFormOptions();
  return (
    <div className="grid max-w-3xl gap-8 sm:gap-10">
      <div className="grid gap-4">
        <Link href="/guests" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
          <Icon name="arrow" size={14} className="rotate-180" />
          All guests
        </Link>
        <PageTitle
          lead="Add a"
          word="guest"
          intro="For someone who isn't in the RSVP app's list. Most guests should come in through an import, so the headcount stays in step with the RSVPs."
        />
      </div>
      <Card className="p-6 sm:p-8">
        <GuestForm
          action={createGuest}
          values={EMPTY_GUEST}
          plusOneChoices={plusOneChoices}
          households={households}
          submitLabel="Add guest"
          imported={false}
        />
      </Card>
    </div>
  );
}
