import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { toneText } from "@/components/ui/Tone";
import type { MemberView } from "@/lib/data/party";
import { attireStatusLabel, ROLE_LABEL } from "@/lib/domain/party";
import { SHOE_STATUS_LABEL } from "@/lib/labels";
import { MemberAvatar } from "./MemberAvatar";
import { attireTone, MENU_STYLE, SHOE_TONE, SUIT_STYLE } from "./menu";

function shoeLine(m: MemberView) {
  if (m.outfitType !== "DRESS") return null;
  const choice = m.shoeName ?? (m.shoeOwnedDescription ? "Their own pair" : null);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span>Shoes:</span>
      <span className="text-cocoa">{choice ?? "not chosen"}</span>
      {m.shoeStatus !== "NOT_SELECTED" ? (
        <span className={`font-medium ${toneText(SHOE_TONE[m.shoeStatus])}`}>· {SHOE_STATUS_LABEL[m.shoeStatus]}</span>
      ) : null}
    </span>
  );
}

function MemberRow({ m }: { m: MemberView }) {
  const menu = m.menu ? MENU_STYLE[m.menu] : null;
  const statusClass = `text-[10.5px] font-semibold tracking-[0.1em] uppercase ${
    m.status === "READY" ? toneText(attireTone(m.status)) : "text-muted"
  }`;
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        href={`/party/${m.id}`}
        className="group -mx-3 flex items-center gap-4 rounded-[2px] px-3 py-3.5 transition-colors hover:bg-ivory/70"
      >
        <MemberAvatar m={m} />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <p className={m.isPlaceholder ? "font-display text-lg leading-tight text-cocoa italic" : "text-[15px]"}>{m.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            {!m.isPlaceholder ? <span>{ROLE_LABEL[m.role]}</span> : null}
            <span className="inline-flex items-center gap-1.5">
              <span className={`size-2 shrink-0 rounded-full ${menu ? menu.swatch : SUIT_STYLE.swatch}`} aria-hidden />
              <span>
                {menu ? menu.label : SUIT_STYLE.label}
                {m.styleName ? <span className="text-cocoa"> · {m.styleName}</span> : null}
              </span>
            </span>
          </p>
          {m.outfitType === "DRESS" ? <p className="mt-0.5 text-xs text-muted">{shoeLine(m)}</p> : null}
          {/* In a narrow card the status sits under the name; in a wider one it has its own column. */}
          <p className={`mt-1 @sm:hidden ${statusClass}`}>{attireStatusLabel(m.status, m.outfitType)}</p>
        </div>
        <span className={`hidden shrink-0 text-right @sm:block ${statusClass}`}>{attireStatusLabel(m.status, m.outfitType)}</span>
        <Icon name="arrow" size={14} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

export function RosterCard({ title, word, members }: { title: string; word: string; members: MemberView[] }) {
  const id = `roster-${word}-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Card className="grid grid-cols-1 content-start gap-2 p-6 sm:p-7" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[28px] leading-tight">
          {title} <em className="italic">{word}</em>
        </h2>
        <span className="label-caps">{members.length} people</span>
      </div>
      <ul className="@container">
        {members.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
      </ul>
    </Card>
  );
}
