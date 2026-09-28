import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Sprig } from "@/components/ui/Ornaments";
import { AddNoteForm } from "@/components/vendors/AddNoteForm";
import { AddQuestionForm, QuestionItem } from "@/components/vendors/Questions";
import { VendorMoneyCard } from "@/components/vendors/VendorMoneyCard";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { requireSession } from "@/lib/auth/require-session";
import { loadVendor } from "@/lib/data/vendors";
import { compareDates, daysBetween, formatClockTime, formatDate, formatInstant, relativeDays } from "@/lib/dates";
import { displayUrl, instagramUrl, telHref } from "@/lib/domain/vendor-contact";
import { arrivesBeforeAccess, statusGroup, VENDOR_CATEGORY_LABEL } from "@/lib/domain/vendors";
import { EVENT_TYPE_LABEL, PARTNER_LABEL, TASK_STATUS_LABEL } from "@/lib/labels";
import { addNote, addQuestion, clearAnswer, deleteNote, deleteQuestion, saveQuestion } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const data = await loadVendor((await params).id);
  return { title: data?.vendor.name ?? "Vendor" };
}

const linkClass = "text-rose-ink underline-offset-4 hover:text-chocolate hover:underline";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className="label-caps text-[10px]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <span aria-hidden> ↗</span>
    </a>
  );
}

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const data = await loadVendor(id);
  if (!data) notFound();
  const { plan, vendor: v, money, questions, log, tasks, events } = data;
  const { settings, today } = plan;
  const tz = settings.timezone;
  const early = arrivesBeforeAccess(v.arrivalTime, settings.venueAccessTime);
  const openCount = questions.filter((q) => q.answer === null).length;
  const hasContact = Boolean(v.contactName || v.email || v.phone || v.website || v.instagram);

  return (
    <div className="grid gap-8 sm:gap-10">
      <Link href="/vendors" className="inline-flex items-center gap-1.5 justify-self-start text-[13px] text-rose-ink hover:text-chocolate">
        <Icon name="arrow" size={14} className="rotate-180" />
        All vendors
      </Link>

      {/* The vendor's card */}
      <Card framed as="section" aria-labelledby="vendor-h" className="overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
        <Sprig flip="x" className="pointer-events-none absolute -top-3 -right-8 w-40 opacity-70 sm:w-52" />
        <div className="relative grid gap-7">
          <header className="grid gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="label-caps text-rose-ink">{VENDOR_CATEGORY_LABEL[v.category]}</span>
              <VendorStatusBadge status={v.status} />
              {v.isDemo ? <span className="text-[10px] font-semibold tracking-[0.12em] text-gold-ink uppercase">Demo</span> : null}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="grid min-w-0 gap-2">
                <h1
                  id="vendor-h"
                  className={`max-w-3xl text-[38px] leading-[1.05] tracking-[-0.01em] sm:text-[52px] ${statusGroup(v.status) === "closed" ? "text-cocoa" : ""}`}
                >
                  {v.name}
                </h1>
                {v.alsoCovers.length > 0 ? (
                  <p className="text-sm text-cocoa">
                    Also covers {v.alsoCovers.map((c) => VENDOR_CATEGORY_LABEL[c].toLowerCase()).join(", ")}
                  </p>
                ) : null}
              </div>
              <Link href={`/vendors/${v.id}/edit`} className={buttonClass("secondary", "sm")}>
                Edit details
              </Link>
            </div>
          </header>

          <dl className="grid gap-x-8 gap-y-5 border-t border-rule pt-6 text-[15px] sm:grid-cols-2 lg:grid-cols-3">
            {v.contactName ? <Detail label="Contact">{v.contactName}</Detail> : null}
            {v.email ? (
              <Detail label="Email">
                <a href={`mailto:${v.email}`} className={linkClass}>
                  {v.email}
                </a>
              </Detail>
            ) : null}
            {v.phone ? (
              <Detail label="Phone">
                <a href={telHref(v.phone)} className={`num ${linkClass}`}>
                  {v.phone}
                </a>
              </Detail>
            ) : null}
            {v.website ? (
              <Detail label="Website">
                <ExternalLink href={v.website}>{displayUrl(v.website)}</ExternalLink>
              </Detail>
            ) : null}
            {v.instagram ? (
              <Detail label="Instagram">
                <ExternalLink href={instagramUrl(v.instagram)}>@{v.instagram}</ExternalLink>
              </Detail>
            ) : null}
            {!hasContact ? (
              <Detail label="Contact">
                <span className="text-muted">
                  No contact details yet.{" "}
                  <Link href={`/vendors/${v.id}/edit`} className={linkClass}>
                    Add them
                  </Link>
                </span>
              </Detail>
            ) : null}
            <Detail label="Contract">
              {v.contractSignedOn ? <span>Signed {formatDate(v.contractSignedOn, "long")}</span> : <span className="text-muted">Not signed yet</span>}
              {v.contractUrl ? (
                <span className="block text-sm">
                  <ExternalLink href={v.contractUrl}>View the contract</ExternalLink>
                </span>
              ) : null}
            </Detail>
            <Detail label="Wedding-day arrival">
              {v.arrivalTime ? (
                <>
                  <span className="num">{formatClockTime(v.arrivalTime)}</span>
                  {early ? (
                    <span className="block text-sm text-gold-ink">
                      Before the venue opens to vendors at {formatClockTime(settings.venueAccessTime).replace(" ", "\u00a0")}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-muted">Not set</span>
              )}
            </Detail>
            <Detail label="Meals for their team">
              <span className="num">{v.mealsRequired}</span>
              {v.mealsRequired > 0 ? (
                <span className="block text-sm text-muted">
                  {v.status === "BOOKED"
                    ? settings.vendorMealsCountTowardHeadcount
                      ? "Counted in the headcount"
                      : "Not counted in the headcount"
                    : "Counted once they're booked"}
                </span>
              ) : null}
            </Detail>
          </dl>

          {v.notes ? (
            <div className="grid gap-2 border-t border-rule pt-6">
              <h2 className="label-caps">Notes</h2>
              <p className="max-w-prose text-[15px] leading-relaxed whitespace-pre-line text-cocoa">{v.notes}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <VendorMoneyCard
        vendorId={v.id}
        vendorName={v.name}
        quotedCents={v.quotedCents}
        money={money}
        categoryName={data.categoryName}
        headcount={plan.headcount.headcount}
      />

      <div className="grid items-start gap-5 lg:grid-cols-12">
        {/* Questions to ask */}
        <Card className="grid gap-6 p-6 sm:p-8 lg:col-span-7" aria-labelledby="questions-h">
          <CardHeading
            id="questions-h"
            title="Questions to ask"
            action={
              questions.length > 0 ? (
                <span className="num text-[13px] text-muted">
                  {openCount === 0 ? "All answered" : `${openCount} of ${questions.length} still to ask`}
                </span>
              ) : undefined
            }
          />
          {questions.length > 0 ? (
            <ul className="grid">
              {questions.map((q) => (
                <QuestionItem
                  key={q.id}
                  q={{
                    id: q.id,
                    text: q.text,
                    answer: q.answer,
                    answeredLabel: q.answeredOn ? formatDate(q.answeredOn, "medium") : null,
                  }}
                  save={saveQuestion.bind(null, q.id)}
                  clear={clearAnswer.bind(null, q.id)}
                  remove={deleteQuestion.bind(null, q.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No questions yet. Jot them down before the next call and tick them off as you go.</p>
          )}
          <div className="border-t border-rule pt-5">
            <AddQuestionForm action={addQuestion.bind(null, v.id)} />
          </div>
        </Card>

        {/* Communication log */}
        <Card className="grid gap-6 p-6 sm:p-8 lg:col-span-5" aria-labelledby="log-h">
          <CardHeading id="log-h" title="Communication log" />
          <AddNoteForm action={addNote.bind(null, v.id)} />
          {log.length > 0 ? (
            <ol className="grid border-t border-rule pt-2" aria-label="Log entries, newest first">
              {log.map((n) => (
                <li key={n.id} className="relative grid gap-1.5 border-b border-rule py-4 pl-5 last:border-b-0 last:pb-0">
                  <span aria-hidden className="absolute top-[1.45rem] left-0 size-[7px] rounded-full bg-dusty-rose" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-xs text-muted">
                      <span className="font-medium text-cocoa">{PARTNER_LABEL[n.author]}</span>
                      {" · "}
                      <time dateTime={n.at.toISOString()} className="num">
                        {formatInstant(n.at, tz, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </p>
                  </div>
                  <p className="text-[14px] leading-relaxed whitespace-pre-line">{n.body}</p>
                  <div className="pt-1">
                    <ConfirmButton action={deleteNote.bind(null, n.id)} question="Delete this note?">
                      Delete<span className="sr-only"> note</span>
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-t border-rule pt-5 text-sm text-muted">
              Nothing logged yet. Note calls, emails and meetings here so we both know where things stand.
            </p>
          )}
        </Card>
      </div>

      {/* Linked tasks and appointments */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="grid gap-4 p-6 sm:p-8" aria-labelledby="tasks-h">
          <CardHeading
            id="tasks-h"
            title="Tasks"
            action={
              <Link href="/tasks" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
                All tasks
                <Icon name="arrow" size={14} />
              </Link>
            }
          />
          {tasks.length > 0 ? (
            <ul className="grid">
              {tasks.map((t) => {
                const done = t.status === "DONE";
                const days = t.dueDate ? daysBetween(today, t.dueDate) : null;
                const overdue = !done && days !== null && days < 0;
                return (
                  <li key={t.id} className="flex gap-3.5 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full border ${
                        done ? "border-garden bg-garden text-paper" : "border-rule-strong bg-paper"
                      }`}
                    >
                      {done ? <Icon name="check" size={11} strokeWidth={2.4} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] leading-snug ${done ? "text-muted line-through decoration-rule-strong" : ""}`}>
                        {t.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {TASK_STATUS_LABEL[t.status]}
                        {t.isMilestone ? " · Milestone" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-sm text-cocoa">{t.dueDate ? formatDate(t.dueDate, "medium") : "No date"}</span>
                      {overdue ? (
                        <span className="block text-[10px] font-semibold tracking-[0.1em] text-brick uppercase">{relativeDays(days!)}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No tasks linked to {v.name}.</p>
          )}
        </Card>

        <Card className="grid gap-4 p-6 sm:p-8" aria-labelledby="events-h">
          <CardHeading
            id="events-h"
            title="Appointments"
            action={
              <Link href="/calendar" className="inline-flex items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
                Calendar
                <Icon name="arrow" size={14} />
              </Link>
            }
          />
          {events.length > 0 ? (
            <ul className="grid">
              {events.map((e) => {
                const past = compareDates(e.date, today) < 0;
                return (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0 ${past ? "text-muted" : ""}`}
                  >
                    <span className="text-center leading-none">
                      <span className="label-caps block text-[10px]">{formatDate(e.date, "month-day").split(" ")[0]}</span>
                      <span className="num mt-1 block font-display text-[26px]">{Number(e.date.slice(8))}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-snug">{e.title}</span>
                      <span className="block text-xs text-muted">
                        {[
                          EVENT_TYPE_LABEL[e.type],
                          formatDate(e.date, "weekday-medium"),
                          e.startAt ? formatInstant(e.startAt, tz, { hour: "numeric", minute: "2-digit" }) : "All day",
                          e.location,
                          past ? "Past" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No appointments yet. Tastings, fittings and meetings with {v.name} will show up here.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
