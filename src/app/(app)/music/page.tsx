import Link from "next/link";
import { AddSongForm } from "@/components/music/AddSongForm";
import { AddProcessionalForm, ProcessionalItem } from "@/components/music/Processional";
import { SongItem } from "@/components/music/SongItem";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { SubmitButton } from "@/components/form/SubmitButton";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider, Sprig } from "@/components/ui/Ornaments";
import { PageTitle, SectionTitle } from "@/components/ui/PageTitle";
import { ToneBadge } from "@/components/ui/Tone";
import type { MusicMoment } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/auth/require-session";
import { loadMusic, type ProcessionalView, type SongView } from "@/lib/data/music";
import { groupByMoment, isKeyMoment, KEY_MOMENTS, MUSIC_PARTS, stillToChoose } from "@/lib/domain/music";
import { MUSIC_MOMENT_LABEL } from "@/lib/labels";
import {
  addProcessionalEntry,
  addSong,
  clearProcessional,
  deleteProcessionalEntry,
  deleteSong,
  moveProcessionalEntry,
  moveSong,
  saveProcessionalEntry,
  saveSong,
  startProcessionalFromParty,
} from "./actions";

export const metadata = { title: "Music" };

const PLACEHOLDER: Partial<Record<MusicMoment, string>> = {
  PRELUDE: "Canon in D",
  PROCESSIONAL: "A Thousand Years",
  FIRST_DANCE: "At Last",
  MUST_PLAY: "Before I Let Go",
  DO_NOT_PLAY: "The Chicken Dance",
};

function SongList({ songs }: { songs: SongView[] }) {
  return (
    <ol className="grid">
      {songs.map((s, i) => (
        <SongItem
          key={s.id}
          song={s}
          save={saveSong.bind(null, s.id)}
          remove={deleteSong.bind(null, s.id)}
          up={i > 0 ? moveSong.bind(null, s.id, "up") : null}
          down={i < songs.length - 1 ? moveSong.bind(null, s.id, "down") : null}
        />
      ))}
    </ol>
  );
}

function MomentRow({ moment, songs }: { moment: MusicMoment; songs: SongView[] }) {
  const key = isKeyMoment(moment);
  return (
    <section
      id={`moment-${moment}`}
      aria-labelledby={`moment-${moment}-h`}
      className="grid scroll-mt-24 gap-3 border-b border-rule py-6 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8"
    >
      <div className="grid content-start gap-1.5">
        <h3 id={`moment-${moment}-h`} className="text-[22px] leading-tight">
          {MUSIC_MOMENT_LABEL[moment]}
        </h3>
        {key ? (
          songs.length > 0 ? (
            <ToneBadge tone="on-track">Chosen</ToneBadge>
          ) : (
            <ToneBadge tone="due-soon">Still to choose</ToneBadge>
          )
        ) : null}
      </div>
      <div className="grid content-start gap-3">
        {songs.length > 0 ? <SongList songs={songs} /> : <p className="text-sm text-muted italic">No song yet.</p>}
        <AddSongForm action={addSong} moment={moment} placeholder={PLACEHOLDER[moment]} />
      </div>
    </section>
  );
}

function Summary({ songs }: { songs: SongView[] }) {
  const missing = stillToChoose(songs);
  const count = (m: MusicMoment) => songs.filter((s) => s.moment === m).length;
  const daySongs = songs.filter((s) => s.moment !== "MUST_PLAY" && s.moment !== "DO_NOT_PLAY").length;
  const chosen = KEY_MOMENTS.length - missing.length;
  return (
    <Card className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12" aria-labelledby="choose-h">
      <div className="grid content-start gap-3">
        <p className="label-caps text-rose-ink">Key moments</p>
        {missing.length === 0 ? (
          <>
            <h2 id="choose-h" className="text-[28px] leading-tight sm:text-[32px]">
              Every key moment has a <em className="italic">song</em>
            </h2>
            <ToneBadge tone="on-track">All {KEY_MOMENTS.length} chosen</ToneBadge>
          </>
        ) : (
          <>
            <h2 id="choose-h" className="text-[28px] leading-tight sm:text-[32px]">
              Still to <em className="italic">choose</em>
            </h2>
            <ul className="flex flex-wrap gap-2">
              {missing.map((m) => (
                <li key={m}>
                  <a
                    href={`#moment-${m}`}
                    className="inline-flex rounded-full border border-rule-strong bg-paper px-3.5 py-1.5 text-[13px] text-chocolate transition-colors hover:border-desert-rose"
                  >
                    {MUSIC_MOMENT_LABEL[m]}
                  </a>
                </li>
              ))}
            </ul>
            <p className="num text-[13px] text-muted">
              {chosen} of {KEY_MOMENTS.length} key moments have a song.
            </p>
          </>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-x-6 border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        {[
          { label: "Songs", value: daySongs },
          { label: "Must play", value: count("MUST_PLAY") },
          { label: "Do not play", value: count("DO_NOT_PLAY") },
        ].map((s) => (
          <div key={s.label} className="flex flex-col justify-between gap-2 lg:justify-start">
            <dt className="label-caps">{s.label}</dt>
            <dd className="num font-display text-[34px] leading-none">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ProcessionalCard({ entries, partySize }: { entries: ProcessionalView[]; partySize: number }) {
  return (
    <Card className="grid gap-6 p-6 sm:p-8" aria-labelledby="processional-h">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="grid gap-1.5">
          <p className="label-caps text-rose-ink">Who walks, and when</p>
          <h2 id="processional-h" className="text-[28px] leading-tight sm:text-[32px]">
            The <em className="italic">processional</em>
          </h2>
        </div>
        {entries.length > 0 ? <p className="num text-sm text-muted">{entries.length} in order</p> : null}
      </div>

      {entries.length === 0 ? (
        <div className="relative grid justify-items-center gap-4 overflow-hidden rounded-[3px] border border-gold/30 px-5 py-9 text-center sm:px-10">
          <Sprig className="pointer-events-none absolute -top-2 -left-10 w-32 opacity-70" />
          <Sprig flip="xy" className="pointer-events-none absolute -right-10 -bottom-2 w-32 opacity-70" />
          <p className="relative max-w-md text-[15px] leading-relaxed text-cocoa">
            Start with a draft from the wedding party: the officiant, grandparents and parents, the attendants in pairs with
            the honor attendants last, then our entrances. Names fill in wherever we&apos;ve added them.
          </p>
          <form action={startProcessionalFromParty} className="relative">
            <SubmitButton pendingLabel="Drafting…">Start from the wedding party</SubmitButton>
          </form>
          <Divider className="relative w-28" />
          <p className="relative text-[13px] text-muted">
            {partySize > 0 ? `${partySize} attendants on the party list. ` : ""}Or add the first line yourself below.
          </p>
        </div>
      ) : (
        <ol className="grid">
          {entries.map((p, i) => (
            <ProcessionalItem
              key={p.id}
              entry={p}
              position={i + 1}
              save={saveProcessionalEntry.bind(null, p.id)}
              remove={deleteProcessionalEntry.bind(null, p.id)}
              up={i > 0 ? moveProcessionalEntry.bind(null, p.id, "up") : null}
              down={i < entries.length - 1 ? moveProcessionalEntry.bind(null, p.id, "down") : null}
            />
          ))}
        </ol>
      )}

      <div className="grid gap-4 border-t border-rule pt-6">
        <AddProcessionalForm action={addProcessionalEntry} />
        {entries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
            <span>Added names to the wedding party since?</span>
            <ConfirmButton
              action={clearProcessional}
              variant="quiet"
              question="Clear the whole processional?"
              confirmLabel="Yes, clear it"
            >
              Clear the list and start again
            </ConfirmButton>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ListCard({ moment, songs, intro }: { moment: "MUST_PLAY" | "DO_NOT_PLAY"; songs: SongView[]; intro: string }) {
  const [lead, word] = moment === "MUST_PLAY" ? ["Must", "play"] : ["Do not", "play"];
  return (
    <Card id={`moment-${moment}`} className="grid scroll-mt-24 content-start gap-5 p-6 sm:p-8" aria-labelledby={`list-${moment}-h`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`list-${moment}-h`} className="text-[28px] leading-tight">
          {lead} <em className="italic">{word}</em>
        </h2>
        <span className="label-caps num">{songs.length === 1 ? "1 song" : `${songs.length} songs`}</span>
      </div>
      <p className="-mt-2 text-[13px] text-muted">{intro}</p>
      {songs.length > 0 ? <SongList songs={songs} /> : <p className="text-sm text-muted italic">Nothing on this list yet.</p>}
      <AddSongForm action={addSong} moment={moment} label={moment === "MUST_PLAY" ? "Add a must-play" : "Add a song to skip"} placeholder={PLACEHOLDER[moment]} />
    </Card>
  );
}

export default async function MusicPage() {
  await requireSession();
  const { songs, processional, partySize } = await loadMusic();
  const byMoment = groupByMoment(songs);
  const part = (key: "ceremony" | "reception") => MUSIC_PARTS.find((p) => p.key === key)!;

  const partCard = (key: "ceremony" | "reception") => {
    const p = part(key);
    return (
      <section aria-labelledby={`part-${key}`} className="grid gap-5">
        <SectionTitle id={`part-${key}`} lead={p.lead} word={p.word} eyebrow={key === "ceremony" ? "For the musicians" : "For the DJ"} />
        <Card className="p-6 sm:p-8">
          {p.moments.map((m) => (
            <MomentRow key={m} moment={m} songs={byMoment.get(m) ?? []} />
          ))}
        </Card>
      </section>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-8 sm:gap-10">
      <PageTitle
        word="Music"
        eyebrow="Wedding day"
        intro="Every song that matters, moment by moment, plus who walks in when. Print it for the DJ and the ceremony musicians."
        actions={
          <Link href="/music/print" className={buttonClass("secondary")}>
            Print for the DJ
          </Link>
        }
      />

      <Summary songs={songs} />

      {partCard("ceremony")}

      <ProcessionalCard entries={processional} partySize={partySize} />

      {partCard("reception")}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ListCard moment="MUST_PLAY" songs={byMoment.get("MUST_PLAY") ?? []} intro="The songs that have to happen. The DJ fits them in." />
        <ListCard moment="DO_NOT_PLAY" songs={byMoment.get("DO_NOT_PLAY") ?? []} intro="Not tonight, not even if someone asks." />
      </div>
    </div>
  );
}
