# ClassFlow

Scheduling and pay for a language-teaching agency in Ho Chi Minh City — a Next.js manager's schedule over a FastAPI/PostgreSQL backend.

Started as a real Excel→API importer for an HCMC agency ([archived ClassFlow](https://github.com/agent-kali/ClassFlow)).

Every partner school emails its schedule as a differently-shaped spreadsheet. ClassFlow absorbs those formats into one canonical lesson model: **every school's chaos flows in; one clean, current, auditable truth flows out.**

**Live demo:** [class-flow-app.vercel.app](https://class-flow-app.vercel.app) · [manager](https://class-flow-app.vercel.app/manager) · [teacher](https://class-flow-app.vercel.app/teacher)

**Status:** the manager's schedule is persisted in PostgreSQL through FastAPI, and both screens require a signed-in user. A manager sees the agency schedule and is the only role that can change it. A teacher sees only their own lessons and earnings. The hosted demo above runs on in-memory fixtures, because it has no backend deployed.

## Run it

Three things: a database, the API, and the web app.

### 1. PostgreSQL

```bash
cd backend
docker compose up -d
```

Brings up `postgres:16` on `localhost:5432` with a `classflow` database and an empty `classflow_test` for the test suite. Any PostgreSQL 16 will do — point `DATABASE_URL` at it instead.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

export DATABASE_URL=postgresql+psycopg://classflow:classflow@localhost:5432/classflow
export AUTH_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
export COOKIE_SECURE=false
python -m alembic upgrade head   # create the schema
python -m app.seed               # teachers, schools, campuses, rooms, class groups
python -m uvicorn app.main:app --reload
```

`AUTH_SECRET` must be at least 32 bytes. The process refuses to start without it, and there is no default. `COOKIE_SECURE=false` is for this local HTTP setup. A production deployment sets `COOKIE_SECURE=true` so the session cookie is marked Secure.

Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

The seed inserts only **reference data** — the rows a lesson's foreign keys need. It creates no lessons, because an empty schedule is a valid starting state: open the manager and add the first lesson yourself. Add `--with-lessons` for a small deterministic week that exercises a cancellation, a no-show, a recorded move, a double-booking and a tight travel gap. Both are idempotent, so re-running changes nothing.

### Development logins

Reference data does not create passwords. Local accounts are opt-in and are not for production:

```bash
export CLASSFLOW_SEED_DEV_USERS=1
export CLASSFLOW_DEV_MANAGER_PASSWORD='replace-with-a-local-password'
export CLASSFLOW_DEV_TEACHER_DAV_PASSWORD='replace-with-a-local-password'
export CLASSFLOW_DEV_TEACHER_MIR_PASSWORD='replace-with-a-local-password'
python -m app.seed
```

| Email | Role | Teacher |
| --- | --- | --- |
| `manager@localhost` | manager | — |
| `dav@localhost` | teacher | David Okafor (`t-dav`) |
| `mir@localhost` | teacher | Mira Novak (`t-mir`) |

Sign in at [http://localhost:3000/login](http://localhost:3000/login). The password is whatever you exported. If that email already exists, the seed leaves the row alone, including the password hash. Delete the user row to change a local password. The seed never prints a password.

The browser talks only to `http://localhost:3000/api/...`. Next.js forwards that to FastAPI. Do not point the browser at port 8000 for logged-in traffic: the session cookie is for the Next origin.

### 3. Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The browser calls `/api/*` on its own origin and Next.js forwards it to FastAPI (see [next.config.ts](next.config.ts)), so there is no CORS setup and the backend origin never reaches the client bundle. `BACKEND_ORIGIN` in [.env.example](.env.example) is that server-side rewrite target. It is not a second place for the browser to send the session cookie.

If the API cannot be reached, the schedule says so and offers a retry. It never falls back to fixture lessons — a plausible-looking wrong schedule is worse than a missing one.

### Fixture demo, no backend

```bash
NEXT_PUBLIC_DATA_SOURCE=mock npm run dev
```

Runs the whole app against [src/data/mockSource.ts](src/data/mockSource.ts): a generated multi-week schedule, entirely in memory, reset on reload. This is what the hosted demo uses. It is opt-in precisely so that the real path can never silently become it.

## Tests

```bash
npm run lint && npx tsc --noEmit && npx vitest run
```

```bash
cd backend && source .venv/bin/activate
export TEST_DATABASE_URL=postgresql+psycopg://classflow:classflow@localhost:5432/classflow_test
python -m pytest -q
```

The backend suite runs against a real PostgreSQL: it builds the schema with `alembic upgrade head` and relies on actual foreign keys and CHECK constraints, so persistence is proven rather than mocked. It skips with an explanatory message if no database is reachable.

## The two screens

- **Landing** (`/`) — public product page for recruiters: positioning, domain rules, and entry into the live demos (EN/VI).
- **Schedule** (`/manager`) — the manager's dense ledger. A continuous-time week ruler where a lesson's height is literally its duration (35, 45, 60, 70, 90 minutes — this domain has no uniform grid). Click a lesson to edit it, cancel it, mark no-show, move it, or delete it; drag a lesson to reschedule it, drag empty space (5-minute snap) or use "New lesson" to create. Double-bookings and tight campus-to-campus travel gaps surface themselves. The pay strip at the bottom shows every teacher's week pay and flashes the delta on every edit. "Import a schedule" shows a school's raw spreadsheet flowing column-by-column into the canonical model, then actually inserts the lessons. Optional guided tour: `/manager?tour=1`.
- **Teacher view** (`/teacher`) — the phone screen, read-only by design. One merged stream across every school, a next-lesson hero, and week/month earnings split into earned-to-now vs scheduled (USD and VND). Cancelled lessons stay visible and are explicitly not paid; finished scheduled lessons settle as earned.

Manager mutations write immediately to PostgreSQL. A signed-in teacher reads only their own persisted lessons. There is no save-and-send. Logging out clears the session; `/manager` and `/teacher` return to the login screen, and the previous person's lessons are dropped from the browser cache before the next account renders.

**Cancel vs delete.** A lesson that was scheduled and then did not happen is `cancelled` or `no-show` — it stays on the schedule, visibly unpaid, because that is a fact about the week worth keeping. Deleting is for a lesson that should never have existed, and it is gone for good, so it asks first.

## Domain rules encoded here

- **The lesson is the atom.** Everything else — earnings, conflicts, the teacher's day — is derived from it.
- **Pay is never stored.** Delivered hours × the teacher's USD rate; scheduled lessons are assumed delivered, and only exceptions (cancelled / no-show) are marked. Didn't happen, not paid.
- **VND is always derived** from USD via one captured bank spot rate, converted in exactly one place ([src/domain/money.ts](src/domain/money.ts)) and rounded to the nearest 1,000 ₫ everywhere.
- **The manager is the only writer.** The teacher reads and never inputs anything — no check-in, no confirmation, no timesheet. The API rejects a teacher's writes with 403. Hiding a button is not the check.

## Architecture

- Next.js (App Router) + React + TypeScript + Tailwind CSS v4, date-fns for time math, and Radix primitives for dialogs/popovers. FastAPI + SQLAlchemy + Alembic over PostgreSQL on the backend.
- **Backend seam:** components only touch the hooks in [src/data/hooks.ts](src/data/hooks.ts), which read a zustand store. That store is a **cache of server state**, not the source of truth: it holds what the last request returned. Every mutation goes to the backend first and then splices in the lesson the response carries, so the screen shows what the database holds. A failed mutation leaves the cache untouched and surfaces the reason.
- The store talks only to the async `DataSource` interface in [src/data/source.ts](src/data/source.ts), implemented by [httpSource.ts](src/data/httpSource.ts) over `fetch` and by [mockSource.ts](src/data/mockSource.ts) in memory. Read hooks stay synchronous, so the timelines and all derived logic still work on a plain array.
- Pure domain logic (earnings, conflicts, money, time) lives in [src/domain/](src/domain/) with no React imports, and runs on lessons regardless of where they came from.
- **Wall-clock times.** `date` plus `startMin`/`endMin` as minutes from midnight, stored exactly as entered and never converted to UTC. The agency lives in one timezone; a lesson at 18:00 is at 18:00.
- **Conflicts are warnings, not rejections.** Overlaps and tight travel gaps are detected on read and shown to the manager. The database has no uniqueness constraint on teacher, room or time, because double-bookings genuinely happen and the manager needs to see them, not be blocked by them.
- The HTTP boundary is specified in [docs/api-contract.md](docs/api-contract.md).

```
src/
  domain/     types, time, money, earnings, conflicts — pure functions
  data/       DataSource seam, http + mock sources, server-state cache, hooks
  components/ shared primitives (MoneyPair, SchoolChip, Combobox, …)
  features/
    manager/  week ruler, filters, lesson popover, create dialog, import, pay strip
    teacher/  merged stream, earnings card
  app/        routes: /, /manager, /teacher
backend/
  app/        FastAPI routes, ORM models, wire schemas, lesson service, seed
  alembic/    migrations
  tests/      integration tests against a real PostgreSQL
```

## Design direction

"The ledger and the timetable." The identity comes from the product's own world — teacher initials, class-code grammars, a rate in dollars and a wage in dong — set in IBM Plex Sans/Mono with tabular figures, on a warm-paper light ground or a dark ground (toggle in the header), with one saturated accent drawn from the teal ink of the 500,000 ₫ note. Money always appears as a paired figure ($ · ₫). The continuous-time ruler is the deliberate aesthetic risk: honest to irregular durations, and unlike any slot-grid calendar.

Keyboard accessible throughout; respects `prefers-reduced-motion`; no emoji in the UI.
