"use client";

import { useDraggable } from "@dnd-kit/core";
import type { SeatGuest } from "@/lib/domain/seating";
import type { DragData } from "./types";

/** Six small dots: the "you can pick this up" mark. */
export function Grip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 14" width={8} height={14} aria-hidden className={`shrink-0 fill-current ${className}`}>
      {[2, 7, 12].map((y) => (
        <g key={y}>
          <circle cx={2} cy={y} r={1.1} />
          <circle cx={6} cy={y} r={1.1} />
        </g>
      ))}
    </svg>
  );
}

/** Shared look for anything that can be picked up and dragged. */
export const handleClass =
  "flex min-w-0 flex-1 cursor-grab touch-manipulation items-center gap-2 rounded-[3px] px-2 py-1.5 text-left select-none [-webkit-touch-callout:none] hover:bg-linen/60 active:cursor-grabbing";

/** A guest who can be dragged to a table (or back to the unassigned list), with an optional "remove". */
export function GuestRow({
  guest,
  from,
  where,
  sub,
  onRemove,
}: {
  guest: SeatGuest;
  /** Table the guest is at, or null in the unassigned list. */
  from: string | null;
  /** Where they are, for the accessible name ("at Table 3", "not seated yet"). */
  where: string;
  /** Small second line (the household). */
  sub?: string;
  onRemove?: () => void;
}) {
  const data: DragData = { kind: "guest", guestIds: [guest.id], label: guest.fullName, from };
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `g:${guest.id}`, data });
  return (
    <li ref={setNodeRef} className={`flex items-center gap-0.5 ${isDragging ? "opacity-35" : ""}`}>
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`${guest.fullName}${guest.isChild ? " (child)" : ""}, ${where}`}
        className={handleClass}
      >
        <Grip className="text-rule-strong" />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-[13.5px] leading-snug text-chocolate">
            {guest.fullName}
            {guest.isChild ? <span className="ml-1.5 text-[10.5px] tracking-[0.1em] text-muted uppercase">Child</span> : null}
          </span>
          {sub ? <span className="truncate text-[11.5px] leading-snug text-muted">{sub}</span> : null}
        </span>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${guest.fullName} from this table`}
          title="Back to the unassigned list"
          className="grid size-8 shrink-0 place-items-center rounded-[3px] text-muted transition-colors hover:bg-brick-wash hover:text-brick"
        >
          <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden className="stroke-current" strokeWidth={1.4} strokeLinecap="round">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        </button>
      ) : null}
    </li>
  );
}
