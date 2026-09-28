"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClass } from "@/components/form/Fields";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToneBadge } from "@/components/ui/Tone";
import {
  capacityStatus,
  capacityWords,
  declinedButSeated,
  filterHouseholds,
  guestsByTable,
  orderAtTable,
  tablesWithRoom,
  unassignedHouseholds,
  type PoolHousehold,
  type SeatGuest,
  type SeatTable,
} from "@/lib/domain/seating";
import { TABLE_SHAPE_LABEL } from "@/lib/labels";
import { AddTables, selectClass, selectStyle, TableEditor } from "./TableForms";
import { TableShape } from "./TableShape";
import { capacityTone, type MoveFn } from "./types";

// Phones: no dragging. Pick a table from a menu and press Assign; remove with a button.

type Room = SeatTable & { open: number };

function AssignControl({
  id,
  guestIds,
  subject,
  rooms,
  move,
}: {
  id: string;
  guestIds: string[];
  subject: string;
  rooms: Room[];
  move: MoveFn;
}) {
  const [tableId, setTableId] = useState("");
  const chosen = rooms.find((r) => r.id === tableId);
  const tooMany = chosen ? guestIds.length > chosen.open : false;
  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen) return;
        move({ guestIds, tableId: chosen.id, subject });
        setTableId("");
      }}
    >
      <div className="flex items-stretch gap-2">
        <label htmlFor={id} className="sr-only">
          Table for {subject}
        </label>
        <select
          id={id}
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          disabled={rooms.length === 0}
          className={`${selectClass} min-w-0 flex-1 py-2 text-[14px]`}
          style={selectStyle}
        >
          <option value="">{rooms.length === 0 ? "No open seats" : "Choose a table…"}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} · {r.open} open
            </option>
          ))}
        </select>
        <button type="submit" disabled={!chosen} className={buttonClass("primary", "sm", "shrink-0")}>
          Assign
        </button>
      </div>
      {tooMany && chosen ? (
        <p className="text-[12.5px] text-brick">
          Only {chosen.open} open at {chosen.label}. Assigning puts it over capacity.
        </p>
      ) : null}
    </form>
  );
}

function HouseholdCard({ household, rooms, move }: { household: PoolHousehold; rooms: Room[]; move: MoveFn }) {
  const [oneByOne, setOneByOne] = useState(false);
  const ids = household.guests.map((g) => g.id);
  const single = household.guests.length === 1;
  const key = household.name.replace(/[^a-z0-9]+/gi, "-");
  return (
    <li>
      <Card as="article" className="grid gap-3 p-4">
        <div className="grid gap-0.5">
          <h3 className="font-sans text-[15px] font-medium">{single ? household.guests[0]!.fullName : household.name}</h3>
          <p className="text-[13px] text-muted">
            {single
              ? household.name
              : `${household.guests.length} to seat: ${household.guests.map((g) => g.fullName).join(", ")}`}
            {household.seatedElsewhere > 0 ? ` · ${household.seatedElsewhere} already seated` : ""}
          </p>
        </div>
        <AssignControl
          id={`assign-${key}`}
          guestIds={ids}
          subject={single ? household.guests[0]!.fullName : `${household.name} (${ids.length} guests)`}
          rooms={rooms}
          move={move}
        />
        {!single ? (
          <button
            type="button"
            onClick={() => setOneByOne((v) => !v)}
            aria-expanded={oneByOne}
            className="justify-self-start text-[13px] text-rose-ink hover:text-chocolate"
          >
            {oneByOne ? "Seat them together" : "Seat one at a time"}
          </button>
        ) : null}
        {oneByOne ? (
          <ul className="grid gap-3 border-t border-rule pt-3">
            {household.guests.map((g) => (
              <li key={g.id} className="grid gap-1.5">
                <span className="text-[14px]">{g.fullName}</span>
                <AssignControl id={`assign-${g.id}`} guestIds={[g.id]} subject={g.fullName} rooms={rooms} move={move} />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </li>
  );
}

function TableItem({
  table,
  tables,
  seated,
  declined,
  move,
}: {
  table: SeatTable;
  tables: SeatTable[];
  seated: SeatGuest[];
  declined: SeatGuest[];
  move: MoveFn;
}) {
  const [editing, setEditing] = useState(false);
  const cap = capacityStatus(seated.length, table.capacity);
  return (
    <li>
      <Card as="article" className="grid overflow-hidden">
        {cap.state === "over" ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brick" /> : null}
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <TableShape
            shape={table.shape}
            capacity={table.capacity}
            seated={seated.length}
            over={cap.state === "over"}
            stroke={2.6}
            className="h-12 w-14 shrink-0"
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h3 className="num truncate text-[22px] leading-tight">{table.label}</h3>
            <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
              <span>
                {TABLE_SHAPE_LABEL[table.shape]} · <span className="num text-cocoa">{seated.length} of {table.capacity}</span>
              </span>
              <ToneBadge tone={capacityTone(cap)}>{capacityWords(cap)}</ToneBadge>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            aria-label={`${editing ? "Close" : "Edit"} ${table.label}`}
            className="shrink-0 px-1 py-1 text-[13px] text-rose-ink hover:text-chocolate"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </header>
        {editing ? (
          <div className="border-t border-rule px-4 py-4">
            <TableEditor table={table} tables={tables} seated={seated.length + declined.length} onDone={() => setEditing(false)} />
          </div>
        ) : null}
        {seated.length + declined.length > 0 ? (
          <ul className="grid border-t border-rule px-4">
            {orderAtTable(seated).map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
                <span className="grid min-w-0">
                  <span className="truncate text-[14px]">{g.fullName}</span>
                  <span className="truncate text-[12px] text-muted">{g.householdName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => move({ guestIds: [g.id], tableId: null, subject: g.fullName })}
                  aria-label={`Remove ${g.fullName} from ${table.label}`}
                  className={buttonClass("secondary", "sm", "shrink-0")}
                >
                  Remove
                </button>
              </li>
            ))}
            {declined.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
                <span className="grid min-w-0">
                  <span className="truncate text-[14px] text-muted line-through decoration-rule-strong">{g.fullName}</span>
                  <span className="text-[11px] font-semibold tracking-[0.1em] text-gold-ink uppercase">Declined</span>
                </span>
                <button
                  type="button"
                  onClick={() => move({ guestIds: [g.id], tableId: null, subject: g.fullName })}
                  className={buttonClass("secondary", "sm", "shrink-0")}
                >
                  Free seat
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-rule px-4 py-3 text-[13px] text-muted">Nobody here yet.</p>
        )}
      </Card>
    </li>
  );
}

export function PhoneList({ tables, guests, move }: { tables: SeatTable[]; guests: SeatGuest[]; move: MoveFn }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const pool = useMemo(() => unassignedHouseholds(guests), [guests]);
  const shown = useMemo(() => filterHouseholds(pool, query), [pool, query]);
  const rooms = useMemo(() => tablesWithRoom(tables, guests), [tables, guests]);
  const byTable = useMemo(() => guestsByTable(tables, guests), [tables, guests]);
  const declined = useMemo(() => declinedButSeated(tables, guests), [tables, guests]);
  const total = pool.reduce((s, h) => s + h.guests.length, 0);
  // One list at a time, so the tables aren't a long scroll below every household.
  const [pane, setPane] = useState<"pool" | "tables" | null>(null);
  const current = pane ?? (total > 0 ? "pool" : "tables");
  const seatedCount = tables.reduce((s, t) => s + (byTable.get(t.id)?.length ?? 0), 0);
  const panes = [
    { key: "pool", label: `To seat · ${total}` },
    { key: "tables", label: `Tables · ${seatedCount} seated` },
  ] as const;

  return (
    <div className="grid gap-6">
      <div role="group" aria-label="Show" className="grid grid-cols-2 rounded-[3px] border border-rule-strong bg-paper p-0.5">
        {panes.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={current === p.key}
            onClick={() => setPane(p.key)}
            className={`num rounded-[2px] px-3 py-2 text-[12px] font-medium tracking-[0.06em] uppercase transition-colors ${
              current === p.key ? "bg-chocolate text-ivory" : "text-cocoa hover:text-chocolate"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section aria-labelledby="phone-pool-h" className="grid gap-4" hidden={current !== "pool"}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="phone-pool-h" className="text-[28px] leading-tight">
            Still to <em className="italic">seat</em>
          </h2>
          <span className="label-caps num">{total} guests</span>
        </div>
        {guests.length === 0 ? (
          <p className="text-[14px] text-cocoa">
            No guests yet. Import the list on the{" "}
            <Link href="/guests" className="text-rose-ink underline underline-offset-4">
              Guests
            </Link>{" "}
            page first.
          </p>
        ) : total === 0 ? (
          <p className="font-display text-xl text-cocoa italic">Everyone has a seat.</p>
        ) : (
          <>
            <div>
              <label htmlFor="phone-search" className="sr-only">
                Search guests and households
              </label>
              <input
                id="phone-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search names or households"
                autoComplete="off"
                className={inputClass}
              />
            </div>
            {rooms.length === 0 ? (
              <p className="text-[13px] text-brick">Every table is full. Add a table or free a seat to keep going.</p>
            ) : null}
            {shown.length === 0 ? <p className="text-[14px] text-muted">No one matches.</p> : null}
            <ul className="grid gap-3">
              {shown.map((h) => (
                <HouseholdCard key={h.name} household={h} rooms={rooms} move={move} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="phone-tables-h" className="grid gap-4" hidden={current !== "tables"}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="phone-tables-h" className="text-[28px] leading-tight">
            The <em className="italic">tables</em>
          </h2>
          <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className={buttonClass("secondary", "sm")}>
            {adding ? "Close" : "Add tables"}
          </button>
        </div>
        {adding ? (
          <Card className="p-4" aria-label="Add tables">
            <AddTables tables={tables} onDone={() => setAdding(false)} />
          </Card>
        ) : null}
        <ul className="grid gap-3">
          {tables.map((t) => (
            <TableItem
              key={t.id}
              table={t}
              tables={tables}
              seated={byTable.get(t.id) ?? []}
              declined={declined.filter((g) => g.tableId === t.id)}
              move={move}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
