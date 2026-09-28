"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { moveGuests } from "@/app/(app)/seating/actions";
import { Icon } from "@/components/ui/Icon";
import {
  applyMove,
  arrivingAt,
  capacityStatus,
  guestsByTable,
  seatingCounts,
  type SeatGuest,
  type SeatTable,
} from "@/lib/domain/seating";
import type { ActionState } from "@/lib/forms";
import { Board } from "./Board";
import { PhoneList } from "./PhoneList";
import { SeatingSummary } from "./SeatingSummary";
import { FirstTables } from "./TableForms";
import type { MoveFn } from "./types";

type Move = { guestIds: string[]; tableId: string | null };
type Status = { id: number; ok: boolean; message: string };

/**
 * The seating chart: live counts, then the drag-and-drop board (tablets and up) or the list
 * with menus (phones). Moves show at once and are saved in the background; the server's answer
 * replaces the optimistic view, so a failed save puts everything back where it was.
 */
export function SeatingWorkspace({ tables, guests }: { tables: SeatTable[]; guests: SeatGuest[] }) {
  const [shown, addMove] = useOptimistic(guests, (state: SeatGuest[], m: Move) => applyMove(state, m.guestIds, m.tableId));
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, startTransition] = useTransition();
  const lastId = useRef(0);

  const counts = useMemo(() => seatingCounts(tables, shown), [tables, shown]);

  const move: MoveFn = ({ guestIds, tableId, subject }) => {
    const byId = new Map(shown.map((g) => [g.id, g]));
    const ids = guestIds.filter((id) => {
      const g = byId.get(id);
      return g && g.tableId !== tableId && (tableId === null || g.rsvpStatus !== "DECLINED");
    });
    if (ids.length === 0) return;

    const table = tableId ? tables.find((t) => t.id === tableId) : undefined;
    const fromPool = ids.every((id) => byId.get(id)!.tableId === null);
    // Mid-sentence, "The Rivera Household" reads as "the Rivera Household".
    const who = subject.replace(/^The /, "the ");
    let message = table
      ? `${fromPool ? "Seated" : "Moved"} ${who} ${fromPool ? "at" : "to"} ${table.label}.`
      : `Moved ${who} back to the unassigned list.`;
    if (table) {
      const seatedNow = guestsByTable([table], shown).get(table.id)!.length;
      const after = capacityStatus(seatedNow + arrivingAt(table.id, shown, ids), table.capacity);
      if (after.state === "over") message += ` ${table.label} is now over capacity by ${after.over}.`;
    }

    const id = ++lastId.current;
    startTransition(async () => {
      addMove({ guestIds: ids, tableId });
      let result: ActionState;
      try {
        result = await moveGuests(ids, tableId);
      } catch {
        result = { ok: false, message: "Couldn't reach the app, so nothing was saved. Check the connection and try again." };
      }
      setStatus({ id, ok: result.ok, message: result.ok ? message : result.message });
      if (result.ok) setTimeout(() => setStatus((s) => (s?.id === id ? null : s)), 6000);
    });
  };

  return (
    <div className="grid gap-8 sm:gap-10">
      <SeatingSummary counts={counts} />

      {tables.length === 0 ? (
        <FirstTables tables={tables} />
      ) : (
        <>
          <div className="hidden md:block">
            <Board tables={tables} guests={shown} move={move} />
          </div>
          <div className="md:hidden">
            <PhoneList tables={tables} guests={shown} move={move} />
          </div>
        </>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6 md:pl-[16.5rem]">
        <div role="status" aria-live="polite" className="pointer-events-auto max-w-lg">
          {status ? (
            <div
              className={`flex items-start gap-3 rounded-[3px] border px-4 py-3 text-[13.5px] shadow-[0_12px_32px_-14px_rgba(62,43,34,0.45)] ${
                status.ok ? "border-rule bg-paper text-chocolate" : "border-brick/40 bg-brick-wash text-brick"
              }`}
            >
              {status.ok ? <Icon name="check" size={18} className="mt-px shrink-0 text-garden-ink" /> : null}
              <span className="min-w-0 flex-1">{status.message}</span>
              <button
                type="button"
                onClick={() => setStatus(null)}
                className="shrink-0 text-[12px] font-medium tracking-[0.06em] uppercase opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          ) : pending ? (
            <p className="rounded-[3px] border border-rule bg-paper px-4 py-2 text-[13px] text-muted shadow-[0_8px_24px_-16px_rgba(62,43,34,0.35)]">Saving…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
