"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { DUE_WINDOW_LABEL, tasksHref, type DueWindow, type TaskFilters } from "@/lib/domain/tasks";
import { OWNER_LABEL, TASK_AREA_LABEL, TASK_STATUS_LABEL, optionsFrom } from "@/lib/labels";

// Filters live in the URL. The due-date window is a row of links; who, status and area are
// small selects that apply as soon as one changes (a plain GET form without JavaScript).

const selectClass =
  "w-full appearance-none rounded-[3px] border border-rule-strong bg-paper bg-[length:10px] bg-[right_0.7rem_center] bg-no-repeat py-2 pr-8 pl-3 text-[13px] text-chocolate focus:border-desert-rose";
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%235C4033' stroke-width='1.4'/%3E%3C/svg%3E\")";

const WINDOWS: DueWindow[] = ["all", "overdue", "week", "month", "90"];

export function FilterBar({ filters, overdueCount }: { filters: TaskFilters; overdueCount: number }) {
  const router = useRouter();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (k: string) => (data.get(k) as string) || null;
    router.push(
      tasksHref(filters, {
        owner: value("owner") as TaskFilters["owner"],
        status: value("status") as TaskFilters["status"],
        area: value("area") as TaskFilters["area"],
      }),
      { scroll: false },
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply(e.currentTarget);
  }

  const select = (name: "owner" | "status" | "area", label: string, all: string, options: Array<{ value: string; label: string }>) => (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={`filter-${name}`} className="label-caps text-[10px]">
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={filters[name] ?? ""}
        onChange={(e) => e.currentTarget.form && apply(e.currentTarget.form)}
        className={selectClass}
        style={{ backgroundImage: chevron }}
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid gap-4">
      <nav aria-label="Due date" className="-mx-1 flex flex-wrap gap-1.5">
        {WINDOWS.map((w) => {
          const active = filters.due === w;
          return (
            <Link
              key={w}
              href={tasksHref(filters, { due: w })}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
                active
                  ? "border-chocolate bg-chocolate text-ivory"
                  : w === "overdue" && overdueCount > 0
                    ? "border-brick/50 text-brick hover:border-brick"
                    : "border-rule-strong text-cocoa hover:border-chocolate hover:text-chocolate"
              }`}
            >
              {DUE_WINDOW_LABEL[w]}
              {w === "overdue" && overdueCount > 0 ? <span className="num text-[11px] font-semibold">{overdueCount}</span> : null}
            </Link>
          );
        })}
      </nav>

      {/* key: re-read the defaults when the URL changes (e.g. after "Clear filters"). */}
      <form
        key={tasksHref(filters)}
        action="/tasks"
        method="get"
        onSubmit={onSubmit}
        aria-label="Filter tasks"
        className="grid grid-cols-3 gap-3 sm:max-w-xl"
      >
        {filters.view !== "list" ? <input type="hidden" name="view" value={filters.view} /> : null}
        {filters.due !== "all" ? <input type="hidden" name="due" value={filters.due} /> : null}
        {select("owner", "Who", "Anyone", optionsFrom(OWNER_LABEL))}
        {select("status", "Status", "Any status", [{ value: "OPEN", label: "Not done yet" }, ...optionsFrom(TASK_STATUS_LABEL)])}
        {select("area", "Area", "Every area", optionsFrom(TASK_AREA_LABEL))}
        <noscript>
          <button type="submit" className="mt-2 rounded-[3px] border border-rule-strong px-3 py-1.5 text-[12px]">
            Apply
          </button>
        </noscript>
      </form>
    </div>
  );
}
