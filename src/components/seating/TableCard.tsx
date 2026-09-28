"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { ToneBadge } from "@/components/ui/Tone";
import { capacityStatus, capacityWords, orderAtTable, type SeatGuest, type SeatTable } from "@/lib/domain/seating";
import { TABLE_SHAPE_LABEL } from "@/lib/labels";
import { GuestRow } from "./GuestRow";
import { TableEditor } from "./TableForms";
import { TableShape } from "./TableShape";
import { capacityTone, type DragData, type DropData, type MoveFn } from "./types";

/** One table on the board: a drop target listing its guests. */
export function TableCard({
  table,
  tables,
  seated,
  declined,
  move,
}: {
  table: SeatTable;
  tables: SeatTable[];
  /** Guests at this table who are coming. */
  seated: SeatGuest[];
  /** Guests at this table who have since declined. */
  declined: SeatGuest[];
  move: MoveFn;
}) {
  const drop: DropData = { tableId: table.id, label: table.label };
  const { setNodeRef, isOver } = useDroppable({ id: `t:${table.id}`, data: drop });
  const { active } = useDndContext();
  const [editing, setEditing] = useState(false);

  const cap = capacityStatus(seated.length, table.capacity);
  const dragged = active?.data.current as DragData | undefined;
  const here = new Set(seated.map((g) => g.id));
  const arriving = isOver && dragged ? dragged.guestIds.filter((id) => !here.has(id)).length : 0;
  const preview = arriving > 0 ? capacityStatus(seated.length + arriving, table.capacity) : null;
  const shown = preview ?? cap;

  return (
    <div
      ref={setNodeRef}
      className={`relative grid content-start rounded-[3px] border bg-paper shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] transition-colors ${
        isOver
          ? preview?.state === "over"
            ? "border-brick ring-1 ring-brick"
            : "border-desert-rose ring-1 ring-desert-rose"
          : cap.state === "over"
            ? "border-brick/45"
            : "border-rule"
      }`}
    >
      <section aria-label={`${table.label}, ${seated.length} of ${table.capacity} seats taken`} className="grid">
        <header className="flex items-start gap-3 px-4 pt-4 pb-3">
          <TableShape
            shape={table.shape}
            capacity={table.capacity}
            seated={seated.length}
            over={cap.state === "over"}
            stroke={2.6}
            className="h-14 w-16 shrink-0"
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h3 className="num truncate text-[23px] leading-tight">{table.label}</h3>
            <p className="text-[12px] text-muted">
              {TABLE_SHAPE_LABEL[table.shape]} ·{" "}
              <span className={`num ${cap.state === "over" ? "text-brick" : "text-cocoa"}`}>
                {seated.length} of {table.capacity}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            aria-label={`${editing ? "Close" : "Edit"} ${table.label}`}
            className="shrink-0 rounded-[3px] px-1.5 py-1 text-[12px] text-rose-ink hover:text-chocolate"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </header>

        <div className={`flex min-h-5 items-center gap-2 px-4 pb-3 ${isOver ? "rounded-[2px]" : ""}`} aria-hidden={preview ? true : undefined}>
          <ToneBadge tone={capacityTone(shown)}>
            {preview ? `+${arriving} · ${capacityWords(preview)}` : capacityWords(cap)}
          </ToneBadge>
        </div>

        {editing ? (
          <div className="border-t border-rule px-4 py-4">
            <TableEditor table={table} tables={tables} seated={seated.length + declined.length} onDone={() => setEditing(false)} />
          </div>
        ) : null}

        <ul className={`grid gap-0.5 border-t border-rule p-2 ${isOver ? "bg-dusty-rose/10" : ""}`}>
          {orderAtTable(seated).map((g) => (
            <GuestRow
              key={g.id}
              guest={g}
              from={table.id}
              where={`at ${table.label}`}
              onRemove={() => move({ guestIds: [g.id], tableId: null, subject: g.fullName })}
            />
          ))}
          {declined.map((g) => (
            <li key={g.id} className="flex items-center gap-0.5">
              <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 pl-[26px]">
                <span className="truncate text-[13.5px] text-muted line-through decoration-rule-strong">{g.fullName}</span>
                <span className="shrink-0 text-[10.5px] font-semibold tracking-[0.1em] text-gold-ink uppercase">Declined</span>
              </span>
              <button
                type="button"
                onClick={() => move({ guestIds: [g.id], tableId: null, subject: g.fullName })}
                className="shrink-0 rounded-[3px] px-2 py-1 text-[12px] text-rose-ink hover:text-chocolate"
              >
                Free seat
              </button>
            </li>
          ))}
          {seated.length === 0 && declined.length === 0 ? (
            <li className="m-1 rounded-[3px] border border-dashed border-rule-strong px-3 py-5 text-center text-[12.5px] text-muted">
              Drop guests here
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
