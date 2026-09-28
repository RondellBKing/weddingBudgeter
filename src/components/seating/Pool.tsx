"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { inputClass } from "@/components/form/Fields";
import type { PoolHousehold } from "@/lib/domain/seating";
import { Grip, GuestRow, handleClass } from "./GuestRow";
import { POOL_LABEL, type DragData, type DropData } from "./types";

function HouseholdItem({ household }: { household: PoolHousehold }) {
  const count = household.guests.length;
  const data: DragData = { kind: "household", guestIds: household.guests.map((g) => g.id), label: household.name, from: null };
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `h:${household.name}`,
    data,
  });
  const already = household.seatedElsewhere > 0 ? `${household.seatedElsewhere} already seated` : null;

  // A household of one is just that guest.
  if (count === 1) {
    return (
      <GuestRow
        guest={household.guests[0]!}
        from={null}
        where="not seated yet"
        sub={already ? `${household.name} · ${already}` : household.name}
      />
    );
  }

  return (
    <li ref={setNodeRef} className={`grid ${isDragging ? "opacity-35" : ""}`}>
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`${household.name}, ${count} guests not seated yet. Drag to seat them together.`}
        className={handleClass}
      >
        <Grip className="text-cocoa/60" />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-[13.5px] leading-snug font-medium text-chocolate">{household.name}</span>
          {already ? <span className="text-[11.5px] leading-snug text-muted">{already}</span> : null}
        </span>
        <span className="num shrink-0 rounded-full bg-linen px-2 py-0.5 text-[11px] text-cocoa">{count}</span>
      </div>
      <ul className="ml-[13px] grid border-l border-rule pl-1.5">
        {household.guests.map((g) => (
          <GuestRow key={g.id} guest={g} from={null} where={`not seated yet, in ${household.name}`} />
        ))}
      </ul>
    </li>
  );
}

/** The unassigned list: guests still to seat, grouped by household. Also a drop target. */
export function Pool({
  households,
  total,
  query,
  onQuery,
  hasGuests,
  dragging,
}: {
  households: PoolHousehold[];
  /** Guests still to seat (before the search filter). */
  total: number;
  query: string;
  onQuery: (q: string) => void;
  hasGuests: boolean;
  /** A seated guest is being dragged (so this list is a place to drop them). */
  dragging: boolean;
}) {
  const drop: DropData = { tableId: null, label: POOL_LABEL };
  const { setNodeRef, isOver } = useDroppable({ id: "pool", data: drop });
  const shown = households.reduce((s, h) => s + h.guests.length, 0);

  return (
    <div
      ref={setNodeRef}
      className={`relative grid rounded-[3px] border bg-paper shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] transition-colors lg:sticky lg:top-6 ${
        isOver ? "border-desert-rose ring-1 ring-desert-rose" : dragging ? "border-dashed border-rule-strong" : "border-rule"
      }`}
    >
      <section aria-labelledby="pool-h" className="grid">
        <div className="grid gap-3 border-b border-rule px-5 pt-5 pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="pool-h" className="text-[26px] leading-tight">
              Still to <em className="italic">seat</em>
            </h2>
            <span className="label-caps num">{total} guests</span>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="pool-search" className="sr-only">
              Search guests and households
            </label>
            <input
              id="pool-search"
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search names or households"
              autoComplete="off"
              className={`${inputClass} py-2 text-[14px]`}
            />
            {query.trim() ? (
              <p className="text-[12px] text-muted" aria-live="polite">
                {shown === 0 ? "No one matches." : `Showing ${shown} of ${total}.`}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={`max-h-[42vh] overflow-y-auto overscroll-contain px-3 py-3 lg:max-h-[calc(100dvh-15rem)] ${isOver ? "bg-dusty-rose/10" : ""}`}
        >
          {!hasGuests ? (
            <p className="px-2 py-6 text-center text-[13px] leading-relaxed text-muted">
              No guests yet. Import the list on the{" "}
              <Link href="/guests" className="text-rose-ink underline underline-offset-4">
                Guests
              </Link>{" "}
              page, then seat them here.
            </p>
          ) : total === 0 ? (
            <p className="px-2 py-6 text-center font-display text-lg text-cocoa italic">Everyone has a seat.</p>
          ) : (
            <ul className="grid gap-1.5" aria-label="Guests still to seat, by household">
              {households.map((h) => (
                <HouseholdItem key={h.name} household={h} />
              ))}
            </ul>
          )}
          {dragging ? (
            <p className="mt-2 rounded-[3px] border border-dashed border-rule-strong px-3 py-3 text-center text-[12.5px] text-muted">
              Drop here to unseat
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
