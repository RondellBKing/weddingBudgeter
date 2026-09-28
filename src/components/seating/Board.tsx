"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  declinedButSeated,
  filterHouseholds,
  guestsByTable,
  unassignedHouseholds,
  type SeatGuest,
  type SeatTable,
} from "@/lib/domain/seating";
import { jumpBetweenTargets, pointerOrOverlap, useSeatingSensors } from "./dnd";
import { Grip } from "./GuestRow";
import { Pool } from "./Pool";
import { TableCard } from "./TableCard";
import { AddTables } from "./TableForms";
import { POOL_LABEL, type DragData, type DropData, type MoveFn } from "./types";

const INSTRUCTIONS =
  "To pick up a guest or a household, press Space or Enter. Use the arrow keys to move between the tables and the unassigned list. Press Space or Enter again to seat them there, or Escape to cancel.";

function who(d: DragData): string {
  return d.kind === "household" ? `${d.label} (${d.guestIds.length} guests)` : d.label;
}

/** The drag-and-drop seating board for tablets and computers. */
export function Board({ tables, guests, move }: { tables: SeatTable[]; guests: SeatGuest[]; move: MoveFn }) {
  const sensors = useSeatingSensors(jumpBetweenTargets);
  const [dragging, setDragging] = useState<DragData | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const byTable = useMemo(() => guestsByTable(tables, guests), [tables, guests]);
  const declined = useMemo(() => declinedButSeated(tables, guests), [tables, guests]);
  const pool = useMemo(() => unassignedHouseholds(guests), [guests]);
  const poolCount = pool.reduce((s, h) => s + h.guests.length, 0);
  const shown = useMemo(() => filterHouseholds(pool, query), [pool, query]);
  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);

  function describe(drop: DropData | undefined): string {
    if (!drop) return "";
    if (drop.tableId === null) return POOL_LABEL;
    const t = tableById.get(drop.tableId);
    const n = byTable.get(drop.tableId)?.length ?? 0;
    return t ? `${t.label}, ${n} of ${t.capacity} seats taken` : drop.label;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const d = active.data.current as DragData;
      return `Picked up ${who(d)}. Use the arrow keys to move between tables, then Space to drop.`;
    },
    onDragOver: ({ active, over }) => {
      const d = active.data.current as DragData;
      return over ? `${who(d)} is over ${describe(over.data.current as DropData)}.` : `${who(d)} is not over a table.`;
    },
    onDragEnd: ({ active, over }) => {
      const d = active.data.current as DragData;
      const drop = over?.data.current as DropData | undefined;
      if (!drop || drop.tableId === d.from) return `${who(d)} was put back. Nothing changed.`;
      return drop.tableId === null ? `${who(d)} moved to ${POOL_LABEL}.` : `${who(d)} seated at ${drop.label}.`;
    },
    onDragCancel: ({ active }) => `Moving ${who(active.data.current as DragData)} was cancelled. Nothing changed.`,
  };

  function onDragStart(e: DragStartEvent) {
    setDragging((e.active.data.current as DragData) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const d = e.active.data.current as DragData | undefined;
    const drop = e.over?.data.current as DropData | undefined;
    if (!d || !drop || drop.tableId === d.from) return;
    move({ guestIds: d.guestIds, tableId: drop.tableId, subject: who(d) });
  }

  return (
    <DndContext
      id="seating-board"
      sensors={sensors}
      collisionDetection={pointerOrOverlap}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      // Scroll only when the pointer is close to the top or bottom edge, so dropping on a table
      // low on the screen doesn't slide the page away underneath it.
      autoScroll={{ threshold: { x: 0, y: 0.1 } }}
      accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
        <Pool
          households={shown}
          total={poolCount}
          query={query}
          onQuery={setQuery}
          hasGuests={guests.length > 0}
          dragging={dragging !== null && dragging.from !== null}
        />

        <section aria-labelledby="tables-h" className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <h2 id="tables-h" className="text-[30px] leading-tight">
                The <em className="italic">tables</em>
              </h2>
              <p className="text-[13px] text-muted">Drag a household or a guest onto a table. Drag them back to unseat.</p>
            </div>
            <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className={buttonClass("secondary", "sm")}>
              {adding ? "Close" : "Add tables"}
            </button>
          </div>
          {adding ? (
            <Card className="p-5 sm:p-6" aria-label="Add tables">
              <AddTables tables={tables} onDone={() => setAdding(false)} />
            </Card>
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] items-start gap-4">
            {tables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                tables={tables}
                seated={byTable.get(t.id) ?? []}
                declined={declined.filter((g) => g.tableId === t.id)}
                move={move}
              />
            ))}
          </div>
        </section>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="flex max-w-[15rem] cursor-grabbing items-center gap-2 rounded-[3px] border border-desert-rose bg-paper px-3 py-2 shadow-[0_12px_28px_-12px_rgba(62,43,34,0.45)]">
            <Grip className="text-desert-rose" />
            <span className="grid min-w-0">
              <span className="truncate text-[13.5px] font-medium text-chocolate">{dragging.label}</span>
              {dragging.kind === "household" ? (
                <span className="num text-[11.5px] text-muted">{dragging.guestIds.length} guests together</span>
              ) : null}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

