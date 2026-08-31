# ClassFlow

Scheduling and pay for a language-teaching agency in Ho Chi Minh City — a high-fidelity, front-end-only demo on mock data.

Started as a real Excel→API importer for an HCMC agency ([archived ClassFlow](https://github.com/agent-kali/ClassFlow)).

Every partner school emails its schedule as a differently-shaped spreadsheet. ClassFlow absorbs those formats into one canonical lesson model: **every school's chaos flows in; one clean, current, auditable truth flows out.**

**Demo status:** mock data, no auth, no database. Changes reset on refresh. A live Vercel URL belongs in this paragraph once deployed — until then run locally.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js demo still uses in-memory mock data (no auth, no database); state resets on reload. A separate FastAPI process in `backend/` currently exposes only a health check.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

## The two screens

- **Landing** (`/`) — public product page for recruiters: positioning, domain rules, and entry into the live demos (EN/VI).
- **Schedule** (`/manager`) — the manager's dense ledger. A continuous-time week ruler where a lesson's height is literally its duration (35, 45, 60, 70, 90 minutes — this domain has no uniform grid). Click a lesson to cancel, mark no-show, or move it; drag empty space (5-minute snap) or use "New lesson" to create. Double-bookings and tight campus-to-campus travel gaps surface themselves. The pay strip at the bottom shows every teacher's week pay and flashes the delta on every edit. "Import a schedule" shows a school's raw spreadsheet flowing column-by-column into the canonical model, then actually inserts the lessons. Optional guided tour: `/manager?tour=1`.
- **Teacher view** (`/teacher`) — the phone screen, read-only by design. One merged stream across every school, a "now" marker, and running week/month earnings in both USD and VND. Cancelled lessons stay visible and are explicitly not paid; delivered lessons settle solid — money already earned.

Edits on the manager screen appear on the teacher screen immediately. There is no save-and-send.

## Domain rules encoded here

- **The lesson is the atom.** Everything else — earnings, conflicts, the teacher's day — is derived from it.
- **Pay is never stored.** Delivered hours × the teacher's USD rate; scheduled lessons are assumed delivered, and only exceptions (cancelled / no-show) are marked. Didn't happen, not paid.
- **VND is always derived** from USD via one captured bank spot rate, converted in exactly one place ([src/domain/money.ts](src/domain/money.ts)) and rounded to the nearest 1,000 ₫ everywhere.
- **The manager is the only writer.** The teacher reads and never inputs anything — no check-in, no confirmation, no timesheet.

## Architecture

- Next.js (App Router) + React + TypeScript + Tailwind CSS v4, with zustand for the shared in-memory store, date-fns for time math, and Radix primitives for dialogs/popovers.
- **Backend seam:** components only touch the hooks in [src/data/hooks.ts](src/data/hooks.ts), which sit over the typed `DataSource` interface in [src/data/source.ts](src/data/source.ts). The mock implementation seeds a zustand store from fixtures; a real API replaces `src/data/` internals without touching the UI.
- Pure domain logic (earnings, conflicts, money, time) lives in [src/domain/](src/domain/) with no React imports.

```
src/
  domain/     types, time, money, earnings, conflicts — pure functions
  data/       DataSource seam, zustand store, hooks, mock fixtures
  components/ shared primitives (MoneyPair, SchoolChip, Combobox, …)
  features/
    manager/  week ruler, filters, lesson popover, create dialog, import, pay strip
    teacher/  merged stream, earnings card
  app/        routes: /, /manager, /teacher
```

## Design direction

"The ledger and the timetable." The identity comes from the product's own world — teacher initials, class-code grammars, a rate in dollars and a wage in dong — set in IBM Plex Sans/Mono with tabular figures, on a warm-paper light ground or a dark ground (toggle in the header), with one saturated accent drawn from the teal ink of the 500,000 ₫ note. Money always appears as a paired figure ($ · ₫). The continuous-time ruler is the deliberate aesthetic risk: honest to irregular durations, and unlike any slot-grid calendar.

Keyboard accessible throughout; respects `prefers-reduced-motion`; no emoji in the UI.
