import { Icon } from "./Icon";

/**
 * The square tick box every checklist in the app uses: empty, or filled with a tick. Purely
 * visual (aria-hidden); the control around it carries the label and state for screen readers.
 * `hoverable` previews the tick when a parent with the `group` class is hovered; `next` marks the
 * step to do next.
 */
export function TickBox({
  checked,
  size = "md",
  hoverable = false,
  next = false,
  dimmed = false,
}: {
  checked: boolean;
  size?: "sm" | "md";
  hoverable?: boolean;
  next?: boolean;
  dimmed?: boolean;
}) {
  const box = size === "sm" ? "size-4" : "size-[19px]";
  const state = checked
    ? "border-garden bg-garden text-paper"
    : `${next ? "border-desert-rose" : "border-rule-strong"} bg-paper text-transparent ${
        hoverable ? "group-hover:border-garden group-hover:text-garden" : ""
      }`;
  return (
    <span
      aria-hidden
      className={`grid ${box} shrink-0 place-items-center rounded-[3px] border transition-colors ${state} ${dimmed ? "opacity-70" : ""}`}
    >
      <Icon name="check" size={size === "sm" ? 11 : 13} strokeWidth={2.4} />
    </span>
  );
}
