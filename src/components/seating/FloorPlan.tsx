"use client";

import { DndContext, useDraggable, type Announcements, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { moveTable } from "@/app/(app)/seating/actions";
import { Card } from "@/components/ui/Card";
import {
  CANVAS,
  capacityStatus,
  clampToCanvas,
  guestsByTable,
  shortTableLabel,
  tableFootprint,
  type SeatGuest,
  type SeatTable,
} from "@/lib/domain/seating";
import { TABLE_SHAPE_LABEL } from "@/lib/labels";
import { restrictToParent, useSeatingSensors } from "./dnd";
import { TableShape } from "./TableShape";

// The room from above. Tables can be dragged (or moved with the keyboard) to where they'll
// stand; each drop saves the table's spot. Guests aren't moved here.

const INSTRUCTIONS =
  "To move a table, press Space or Enter to pick it up, use the arrow keys to slide it, and press Space or Enter again to put it down. Escape puts it back.";

type Placement = { id: string; x: number; y: number };

const GRID = {
  backgroundImage:
    "linear-gradient(to right, rgba(205,188,174,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(205,188,174,0.28) 1px, transparent 1px)",
  backgroundSize: `${(100 * 50) / CANVAS.width}% ${(100 * 50) / CANVAS.height}%`,
};

function FloorTable({ table, seated }: { table: SeatTable; seated: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id, data: { label: table.label } });
  const size = tableFootprint(table.shape, table.capacity);
  const cap = capacityStatus(seated, table.capacity);
  const over = cap.state === "over";
  // Head and sweetheart tables have their seats along the top; center the words on the table.
  const oneSided = table.shape === "HEAD_TABLE" || table.shape === "SWEETHEART";
  const status = over ? `over capacity by ${cap.over}` : cap.state === "full" ? "full" : `${cap.open} open`;

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`${table.label}, ${TABLE_SHAPE_LABEL[table.shape].toLowerCase()} table, ${seated} of ${table.capacity} seats, ${status}.`}
      title={`${table.label} · ${seated} of ${table.capacity}`}
      className={`absolute cursor-grab touch-manipulation rounded-[6px] select-none [-webkit-touch-callout:none] active:cursor-grabbing ${
        isDragging ? "z-20 drop-shadow-[0_10px_14px_rgba(62,43,34,0.28)]" : "z-10"
      }`}
      style={{
        left: `${((table.x - size.w / 2) / CANVAS.width) * 100}%`,
        top: `${((table.y - size.h / 2) / CANVAS.height) * 100}%`,
        width: `${(size.w / CANVAS.width) * 100}%`,
        height: `${(size.h / CANVAS.height) * 100}%`,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <TableShape shape={table.shape} capacity={table.capacity} seated={seated} over={over} className="absolute inset-0 size-full" />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 grid content-center justify-items-center px-[8%] leading-none"
        style={{ top: oneSided ? `${(19 / size.h) * 100}%` : 0 }}
      >
        <span className="num max-w-full truncate font-display text-[max(10px,1.7cqw)] leading-tight font-semibold text-chocolate">
          {shortTableLabel(table.label)}
        </span>
        {/* On a small plan (phones) the count doesn't fit inside the table; the seat dots show it. */}
        <span
          className={`num mt-[0.1em] hidden text-[max(8.5px,0.95cqw)] leading-none @xl:block ${over ? "font-semibold text-brick" : "text-cocoa"}`}
        >
          {seated}/{table.capacity}
        </span>
      </span>
      {over ? (
        <span className="pointer-events-none absolute -top-[0.9em] left-1/2 -translate-x-1/2 rounded-[2px] bg-paper px-1 text-[max(8px,0.8cqw)] font-semibold tracking-[0.1em] text-brick uppercase">
          Over
        </span>
      ) : null}
    </button>
  );
}

export function FloorPlan({ tables, guests }: { tables: SeatTable[]; guests: SeatGuest[] }) {
  const [placed, place] = useOptimistic(tables, (state: SeatTable[], p: Placement) =>
    state.map((t) => (t.id === p.id ? { ...t, x: p.x, y: p.y } : t)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canvas = useRef<HTMLDivElement>(null);
  const sensors = useSeatingSensors();
  const byTable = useMemo(() => guestsByTable(tables, guests), [tables, guests]);
  const labelOf = (id: string | number) => placed.find((t) => t.id === id)?.label ?? "The table";

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}. Use the arrow keys to slide it, then Space to put it down.`,
    onDragOver: () => undefined,
    onDragMove: () => undefined,
    onDragEnd: ({ active }) => `${labelOf(active.id)} put down. Its new spot is saved.`,
    onDragCancel: ({ active }) => `${labelOf(active.id)} went back to where it was.`,
  };

  function onDragEnd({ active, delta }: DragEndEvent) {
    const t = placed.find((x) => x.id === active.id);
    const rect = canvas.current?.getBoundingClientRect();
    if (!t || !rect || (delta.x === 0 && delta.y === 0)) return;
    const scale = rect.width / CANVAS.width;
    const next = clampToCanvas({ x: t.x + delta.x / scale, y: t.y + delta.y / scale }, tableFootprint(t.shape, t.capacity));
    startTransition(async () => {
      place({ id: t.id, ...next });
      try {
        const result = await moveTable(t.id, next.x, next.y);
        setError(result.ok ? null : result.message);
      } catch {
        setError(`Couldn't save where ${t.label} goes, so it went back. Try again.`);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="p-2.5 sm:p-4">
        <DndContext
          id="floor-plan"
          sensors={sensors}
          modifiers={[restrictToParent]}
          accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
          onDragEnd={onDragEnd}
        >
          <div
            ref={canvas}
            role="group"
            aria-label="Floor plan. Each table is a button you can pick up and move."
            className="@container relative aspect-[3/2] w-full overflow-hidden rounded-[2px] border border-rule bg-ivory"
            style={GRID}
          >
            {placed.map((t) => (
              <FloorTable key={t.id} table={t} seated={byTable.get(t.id)?.length ?? 0} />
            ))}
          </div>
        </DndContext>
      </Card>

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-cocoa" aria-label="Key">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full bg-desert-rose" />
            Seat taken
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full border border-rule-strong bg-paper" />
            Seat open
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full border border-brick bg-brick-wash" />
            Over capacity
          </li>
        </ul>
        <p className="max-w-md text-[13px] text-muted">
          Drag a table to where it will stand; it&apos;s saved when you let go. On a touch screen, press and hold the table
          first. With a keyboard, focus a table, press Space, then use the arrow keys.
          <span className="mt-1 block md:hidden">The plan is easier to arrange on a tablet or computer.</span>
        </p>
      </div>
      <p role="status" aria-live="polite" className="text-[13px] text-brick">
        {error}
      </p>
    </div>
  );
}
