import type { ReactNode } from "react";
import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";
import { Divider, Sprig } from "./Ornaments";

/** A composed, invitation-style card for a page with nothing in it yet. */
export function EmptyState({ icon, title, word, children }: { icon: IconName; title: string; word: string; children: ReactNode }) {
  return (
    <Card framed className="overflow-hidden px-7 py-14 text-center sm:px-14">
      <Sprig className="pointer-events-none absolute -top-2 -left-8 w-40 opacity-80" />
      <Sprig flip="xy" className="pointer-events-none absolute -right-8 -bottom-2 w-40 opacity-80" />
      <div className="relative mx-auto grid max-w-lg justify-items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full border border-gold/60 text-rose-ink">
          <Icon name={icon} size={26} />
        </span>
        <h2 className="text-[34px] leading-tight sm:text-[40px]">
          {title} <em className="italic">{word}</em>
        </h2>
        <Divider className="w-32" />
        <div className="grid gap-3 text-[15px] leading-relaxed text-cocoa">{children}</div>
      </div>
    </Card>
  );
}
