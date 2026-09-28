import type { DressMenu, PartyRole } from "@/lib/domain/party";
import { MENU_STYLE, SUIT_STYLE } from "./menu";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const ROLE_MARK: Partial<Record<PartyRole, string>> = {
  BEST_MAN: "BM",
  MAID_OF_HONOR: "MH",
  MATRON_OF_HONOR: "MT",
  BRIDESMAN: "B",
};

const SIZE = {
  sm: "size-9 text-base",
  md: "size-11 text-lg",
  lg: "size-16 text-[26px]",
} as const;

/** A round badge tinted by the person's menu. Placeholders show their number or a role mark. */
export function MemberAvatar({
  m,
  size = "md",
}: {
  m: { name: string; isPlaceholder: boolean; role: PartyRole; menu: DressMenu | null };
  size?: keyof typeof SIZE;
}) {
  const tint = m.menu ? MENU_STYLE[m.menu].avatar : SUIT_STYLE.avatar;
  const badge = m.isPlaceholder ? (m.name.match(/(\d+)$/)?.[1] ?? ROLE_MARK[m.role] ?? initials(m.name)) : initials(m.name);
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border border-paper font-display text-chocolate ring-1 ring-rule-strong ${SIZE[size]} ${tint}`}
    >
      {badge}
    </span>
  );
}
