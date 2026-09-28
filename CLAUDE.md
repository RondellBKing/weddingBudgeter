# Wedding HQ

Private planning app for Rondell and Capri's wedding. Two users, one shared login, 100% internal.
This app is the system of record for money, vendors, deadlines, the wedding party and seating.

## Current phase

**Phase 0 (Foundation) is done. Next: Phase 1 (Money).** Stop after each phase, run
typecheck/lint/test/build, commit, and show the user before starting the next one.

Phases:
- 0 Foundation: scaffold, tokens, schema, auth, shell, seed, backup/restore. ✅
- 1 Money: budget categories and items, payments, budget page, payment schedule.
- 2 Vendors: CRUD, detail pages, coverage view, links to budget items and payments.
- 3 Tasks + Calendar: task views, the seeded checklist, merged calendar, milestones, .ics feed.
- 4 Wedding party: 14-member tracker, attire menus, Nov 7, 2027 sizing roll-up.
- 5 Guests + Seating: CSV import (mapping, dry run, dedupe), floor plan, printable list.
- 6 Dashboard for real.
- 7 Ship: production deploy and backups in place (backup/restore scripts already exist).

The user found long option lists overwhelming. Ask one question at a time, in plain language.

## Wedding facts (confirmed, don't re-ask)

- **Date:** Thursday, April 13, 2028. Rehearsal dinner Wednesday, April 12. America/New_York.
  It's Holy Thursday, during Passover (evening of 4/10 through 4/18), the day before Good
  Friday (a NJ state holiday), and Easter is 4/16. Never seed tasks that assume a Saturday.
- **Venue:** The Estate at Florentine Gardens, River Vale, NJ. Contract signed by DocuSign
  4/17–4/18/2026. Vendor/setup arrival from 6:00 AM.
- **Headcount:** the venue includes **125 people**, and that 125 counts everyone eating,
  including the couple and the 14 attendants. **$200 per person above 125.**
- **Budget:** $100,000 total. Categories add up to **$98,700**: bridesmaids' dresses are
  handled outside this app (user's decision, 9/28/2026), so $1,300 is unassigned. Unassigned
  money is not counted as headroom.
- **Contingency buffer:** $4,000, so break-even is 145 people (computed live, never hardcoded).
- **Venue payments** (fixed total $54,000):
  1. 2026-04-19 $10,000 deposit, **paid 2026-04-18**
  2. 2026-10-19 $10,000
  3. 2027-10-19 $15,000
  4. 2028-03-03 $15,650 (reaches contract minimum)
  5. 2028-04-01 headcount overage, (headcount − 125) × $200, computed live until paid
  6. 2028-04-01 $3,350 maître d' fee, kind `SERVICE_CHARGE` (mandatory; never a tip)
- **Wedding party (14):** groom's side: best man + 6 groomsmen (suits). Bride's side: maid of
  honor + matron of honor (Menu B dresses, Desert Rose), bridesman (suit, Menu C, Dusty Rose
  bow tie), 4 bridesmaids (Menu A dresses, Dusty Rose). Attire branches on `outfitType`, not side.
  Maid of honor and matron of honor are distinct roles. Names are blank until the user adds them.
- **Dress selection and sizing deadline:** Sunday, November 7, 2027 (also the day DST ends).
- **Attire menus:** A (Dusty Rose): Maci, Cheryl, Johana, Soren, Kiaryn, Mai. B (Desert Rose):
  Sonel, Aretha, Nira, Agustina. Shoes (chocolate brown patent, 3.5"+): Platform Stiletto,
  Minimal Strappy Stiletto, Ankle Strap Open-Toe Heel, Block Heel. Owned shoes need approval.
  Gold metals only, no silver.
- Don't assume which partner is the bride or groom from their names. Use they/them.

## Stack

- Next.js 16.3.6 (App Router, Turbopack), React 19.3, TypeScript 6.0.3, Tailwind 4.3, Recharts 3.10.
  TS 7 is out but drops the JS compiler API that Next's type check and typescript-eslint use.
- Postgres + Prisma **7.10.0** (pinned exactly; the `prisma` package's `latest` tag pointed at an
  8.0 RC). Prisma 7 style: `prisma.config.ts`, `prisma-client` generator output in
  `src/generated/prisma`, `@prisma/adapter-pg` driver adapter.
- Hosting: Vercel + Neon (free tier). Local dev against local Postgres.
- Next 16 renamed middleware to `src/proxy.ts`.
- Read `node_modules/next/dist/docs/` before using a Next API you're unsure of (see AGENTS.md).
- Server Components and Server Actions for data. No REST layer unless something needs it.

## Rules that must not be broken

1. **Derived, never stored.** Paid, remaining, committed, next-due, attire status, dress menu,
   contingency left, headroom: always computed. If a column holds a sum or a status that other
   columns already imply, it's wrong. `Payment` rows are the spine.
2. **Money is integer cents.** `src/lib/money.ts` parses strings without floats and formats at
   the edge. Rates are parts per million (6.625% = 66250).
3. **Dates.** Due dates, paid dates and deadlines are Postgres `date` columns and
   `CalendarDate` strings ("YYYY-MM-DD") in code. Convert only with `fromDbDate`/`toDbDate`.
   "Today" is `todayIn(settings.timezone)`, never the server's clock (Vercel runs in UTC).
   Day counts use `daysBetween` (DST-proof). Instants are timestamptz, shown in New York time.
   Tests run in three time zones (`npm test`).
4. **Auth.** `requireSession()` at the top of every page, data function, Server Action and
   route handler. `proxy.ts` is only a fast redirect.
5. **Demo vs. real data.** Real seed rows have `seedKey` (re-running the seed never duplicates
   or overwrites). Demo rows have `isDemo = true`, are removed with `npm run demo:wipe`, and
   `seed:demo` refuses non-local databases.
6. **Don't lose data.** Destructive actions confirm first. Backups: `npm run backup`; restore is
   tested in CI.

## Core math (src/lib/domain)

- committed(item) = max(contracted, Σ scheduled payments); the overage payment raises the
  venue's committed amount, so it draws down the contingency through the normal overrun rule.
- contingency left = contingency estimate − Σ category overruns + unspent estimate of closed
  categories − anything committed against the contingency category itself.
- headcount = the settings target until a guest list exists, then guests not declined
  (pending counts as coming), plus booked vendors' meals while the setting says they count.
- headroom: break-even = largest headcount whose overage fits the contingency; the dashboard
  shows "N guests until the contingency is gone".
- Over-budget banner fires when contingency left < 0, louder when contracts alone exceed budget.

## Design

Editorial wedding stationery, not an admin dashboard. Serif page titles with the descriptor
word in italic ("Our *Budget*"), quiet sans for data, 1px hairline rules, lots of air, big quiet
numbers, small uppercase tracked labels (`label-caps`), tabular numbers (`num`).

- Fonts: Cormorant Garamond (500/600 + italic) for titles; Inter for everything else.
- Tokens live in `src/app/globals.css` (`@theme`). Tailwind's default palette is cleared.
  Chocolate #3E2B22 text · Cocoa #5C4033 · Ivory #F7F0E8 background · Paper #FFFCF8 surfaces ·
  Dusty Rose #D9A3A0 (primary accent) · Desert Rose #B5706B (secondary) · Gold #B8912F
  (sparingly) · Garden #6B7A5A on track · Brick #9C3B2E overdue.
- **Text contrast:** Dusty Rose, Desert Rose, Gold and Garden fail AA as text on Ivory. Use them
  for fills only; for text use `rose-ink` #A15651, `gold-ink` #836722, `garden-ink` #637154.
- Status = on track Garden · due soon Gold · overdue Brick, always with a word, never color alone.
- Charts: thin rings and horizontal bars, muted, categorical ramp Dusty Rose → Desert Rose →
  Cocoa → Garden → Gold. Direct labels on every chart (the light colors need them).
- No silver, grey-blue or cool tones anywhere. Warm greys only.
- Phones are first-class: tables become stacked cards, never a sideways-scrolling table.
- Dark mode: skipped for v1.

## Non-goals

No RSVP collection, guest-facing pages, public site or email sending (a separate app handles
invitations and RSVPs; we import its CSV). No multi-tenancy or user accounts. No native app.
No AI features.

## Deferred (plan for, don't build yet)

Catering and meal counts (vendor meals come from `Vendor.mealsRequired`, never guest rows),
day-of itinerary (times are "HH:MM" wedding-day strings), vision board, decor and rentals,
music, photo shot list, rain plan, gifts and thank-yous, file uploads (v1 stores a URL; later
Vercel Blob), venue comparison (not needed).

## Commands

```
npm run dev            # http://localhost:3000
npm run typecheck      # next typegen && tsc
npm run lint
npm test               # vitest in New York, UTC and UTC+14
npm run build
npm run db:migrate     # prisma migrate dev
npm run seed           # real data, idempotent
npm run seed:demo      # sample rows (local only); npm run demo:wipe removes them
npm run backup         # backups/wedding-hq-<timestamp>.json
npm run restore -- <file> [--verify]
npm run hash-password  # APP_PASSWORD_HASH value
```

@AGENTS.md
