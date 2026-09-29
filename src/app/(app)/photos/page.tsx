import Link from "next/link";
import { SubmitButton } from "@/components/form/SubmitButton";
import { AddShotForm } from "@/components/photos/AddShotForm";
import { ShotItem } from "@/components/photos/ShotItem";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import type { ShotMoment } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/require-session";
import { loadShots, type ShotView } from "@/lib/data/photos";
import { groupByMoment } from "@/lib/domain/music";
import { SHOT_PARTS, shotCounts, STANDARD_SHOT_LIST } from "@/lib/domain/photos";
import { SHOT_MOMENT_LABEL } from "@/lib/labels";
import { addShot, deleteShot, moveShot, saveShot, setMustHave, startFromStandardList } from "./actions";

export const metadata = { title: "Photos" };

const FAMILY_ORDER_NOTE = "These need people gathered, so they run in the order that keeps the fewest people moving.";

const PLACEHOLDER: Record<ShotMoment, string> = {
  DETAILS: "Grandmother's brooch on the bouquet",
  GETTING_READY: "Our moms zipping and buttoning",
  FIRST_LOOK: "The first look with a parent",
  CEREMONY: "The unity ceremony",
  FAMILY: "Couple with the godparents",
  WEDDING_PARTY: "Everyone jumping, mid-air",
  COUPLE: "Under the garden arbor",
  COCKTAIL_HOUR: "The cigar and whiskey bar",
  RECEPTION: "The anniversary dance",
  OTHER: "The getaway car",
};

function MomentBlock({ moment, shots }: { moment: ShotMoment; shots: ShotView[] }) {
  const family = moment === "FAMILY";
  return (
    <section
      id={`shots-${moment}`}
      aria-labelledby={`shots-${moment}-h`}
      className="grid scroll-mt-24 gap-3 border-b border-rule py-6 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8"
    >
      <div className="grid content-start gap-1">
        <h3 id={`shots-${moment}-h`} className="text-[22px] leading-tight">
          {SHOT_MOMENT_LABEL[moment]}
        </h3>
        <p className="label-caps num">{shots.length === 1 ? "1 shot" : `${shots.length} shots`}</p>
        {family && shots.length > 1 ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{FAMILY_ORDER_NOTE}</p> : null}
      </div>
      <div className="grid content-start gap-3">
        {shots.length > 0 ? (
          <ol className="grid">
            {shots.map((s, i) => (
              <ShotItem
                key={s.id}
                shot={s}
                number={family ? i + 1 : null}
                save={saveShot.bind(null, s.id)}
                toggle={setMustHave.bind(null, s.id, !s.isMustHave)}
                remove={deleteShot.bind(null, s.id)}
                up={i > 0 ? moveShot.bind(null, s.id, "up") : null}
                down={i < shots.length - 1 ? moveShot.bind(null, s.id, "down") : null}
              />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted italic">Nothing here yet.</p>
        )}
        <AddShotForm action={addShot} moment={moment} placeholder={PLACEHOLDER[moment]} />
      </div>
    </section>
  );
}

function Counts({ shots }: { shots: ShotView[] }) {
  const c = shotCounts(shots);
  const stats = [
    { label: "Shots", value: c.total, sub: null, href: null },
    { label: "Must-haves", value: c.mustHaves, sub: "Starred, and marked in words on the printout", href: null },
    { label: "Family groupings", value: c.family, sub: FAMILY_ORDER_NOTE, href: "#shots-FAMILY" },
  ];
  return (
    <section aria-label="Shot list at a glance" className="grid border-y border-rule sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-rule py-4 last:border-b-0 sm:flex sm:flex-col sm:gap-2 sm:border-b-0 sm:border-l sm:px-6 sm:py-5 sm:first:border-l-0 sm:first:pl-0"
        >
          <span className="label-caps">{s.label}</span>
          <span className="num row-span-2 font-display text-[34px] leading-none">{s.value}</span>
          {s.sub ? (
            <span className="text-xs leading-relaxed text-muted">
              {s.href ? (
                <a href={s.href} className="underline-offset-4 hover:text-rose-ink hover:underline">
                  {s.sub}
                </a>
              ) : (
                s.sub
              )}
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export default async function PhotosPage() {
  await requireSession();
  const shots = await loadShots();
  const byMoment = groupByMoment(shots);
  const template = shotCounts(STANDARD_SHOT_LIST);

  return (
    <div className="grid grid-cols-1 gap-8 sm:gap-10">
      <PageTitle
        word="Photos"
        eyebrow="Wedding day"
        intro="The shot list for the photographer, with every family grouping and who needs to be in it."
        actions={
          shots.length > 0 ? (
            <Link href="/photos/print" className={buttonClass("secondary")}>
              Print for the photographer
            </Link>
          ) : null
        }
      />

      {shots.length === 0 ? (
        <EmptyState icon="camera" title="Start with the" word="shot list">
          <p>
            A planner&apos;s standard list: the details, getting ready, the first look, the ceremony, {template.family} family groupings
            by role, the wedding party, golden hour portraits and the reception. {template.total} shots, {template.mustHaves} of
            them starred as must-haves. Change anything after.
          </p>
          <form action={startFromStandardList} className="mt-1">
            <SubmitButton pendingLabel="Adding the list…">Start from the standard shot list</SubmitButton>
          </form>
          <div className="mt-3 grid gap-3 border-t border-rule pt-5">
            <p className="text-[13px] text-muted">Or build it yourself, one shot at a time.</p>
            <AddShotForm action={addShot} label="Add our first shot" placeholder="Couple with the flower girl" align="center" />
          </div>
        </EmptyState>
      ) : (
        <>
          <Counts shots={shots} />
          {SHOT_PARTS.map((part) => (
            <section key={part.key} aria-labelledby={`part-${part.key}`} className="grid gap-5">
              <SectionTitle id={`part-${part.key}`} lead={part.lead} word={part.word} />
              <Card className="p-6 sm:p-8">
                {part.moments.map((m) => (
                  <MomentBlock key={m} moment={m} shots={byMoment.get(m) ?? []} />
                ))}
              </Card>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
