"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { inputClass } from "@/components/form/Fields";
import { matchGuests, type GuestChoice } from "@/lib/domain/gifts";

/**
 * "From": free text, with the guest list as suggestions. Picking a suggestion links the gift
 * to that guest (the text stays editable, the link stays until "Unlink"). A searchable list
 * instead of a 130-name dropdown, so it works on a phone.
 */
export function FromField({
  guests,
  defaultName,
  defaultGuestId,
  error,
  idPrefix = "",
}: {
  guests: GuestChoice[];
  defaultName: string;
  defaultGuestId: string;
  error?: string;
  idPrefix?: string;
}) {
  const byId = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const [text, setText] = useState(defaultName);
  const [linked, setLinked] = useState<GuestChoice | null>(defaultGuestId ? (byId.get(defaultGuestId) ?? null) : null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => matchGuests(guests, text, 8), [guests, text]);
  const showList = open && matches.length > 0 && !(linked && text === linked.fullName);

  const id = `f-${idPrefix}fromName`;
  const listId = `${id}-list`;
  const statusId = `${id}-status`;

  function pick(g: GuestChoice) {
    setText(g.fullName);
    setLinked(g);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === "ArrowDown" && matches.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActive(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[Math.min(active, matches.length - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="label-caps">
        From
      </label>
      <div className="relative">
        <input
          id={id}
          name="fromName"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : statusId}
          autoComplete="off"
          required
          maxLength={200}
          placeholder={guests.length > 0 ? "Type a name or household" : "Who it's from"}
          className={inputClass}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Guests on the list"
          hidden={!showList}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-[3px] border border-rule-strong bg-paper py-1 shadow-[0_12px_32px_-12px_rgba(62,43,34,0.35)]"
        >
          {showList
            ? matches.map((g, i) => (
                <li
                  key={g.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // Keep focus in the input so the list doesn't close before the tap lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(g)}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-3 py-2.5 ${i === active ? "bg-linen" : ""}`}
                >
                  <span className="block text-[15px] leading-snug">{g.fullName}</span>
                  <span className="block text-[12px] text-muted">{g.householdName}</span>
                </li>
              ))
            : null}
        </ul>
      </div>
      <input type="hidden" name="guestId" value={linked?.id ?? ""} />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-brick">
          {error}
        </p>
      ) : null}
      <p id={statusId} aria-live="polite" className="text-[13px] text-muted">
        {linked ? (
          <>
            Linked to <span className="text-chocolate">{linked.fullName}</span>, {linked.householdName}.{" "}
            <button type="button" onClick={() => setLinked(null)} className="text-rose-ink underline underline-offset-4 hover:text-chocolate">
              Unlink
            </button>
          </>
        ) : guests.length > 0 ? (
          "Pick a name from the list to link it to a guest, or write anything."
        ) : (
          "A name, a couple or a family."
        )}
      </p>
    </div>
  );
}
