# CLAUDE.md — architecture & maintenance

Internal guide for working on this codebase. User-facing setup/run docs live in
[README.md](README.md).

## What this is

A single-purpose app for two organizers to run an Insurely conference: define
teams and mini tournaments, enter scores from a phone, and show a live board.
No multi-tenant concerns. Organizers == admins == facilitators (same people).
Small data set (≈6 teams, a handful of tournaments).

**Auth boundary (enforced by Cloudflare Access, not the app):** `/teams`,
`/score`, `/tournaments` are admin-only; the domain root `/` is public. The
public board at `/` is additionally gated in-app by the `public_leaderboard`
setting — when off it renders "Public leaderboard is currently disabled"
regardless of who's viewing. Admins flip it from the Tourneys page
(`setPublicLeaderboard`). The app does not read Access JWTs; it trusts the
edge to keep unauthorized users off the admin paths.

## Stack & rendering model

- **Next.js App Router** (React 19), TypeScript. Runtime is `next start` (`npm start`).
- **Server Components** read the DB directly (synchronous `node:sqlite`); there
  is no API layer. Mutations are **Server Actions** in `lib/actions.ts`
  (`'use server'`), invoked from `<form action={...}>`.
- After every mutation, `revalidatePath('/', 'layout')` refreshes all pages.
- All pages export `const dynamic = 'force-dynamic'` — standings must reflect
  the latest DB state on each request, never static.
- The only client component is interactivity that needs state: `app/nav.tsx`
  (active tab) and `app/tournaments/tournament-form.tsx` (show fields for the
  selected scoring type).
- **Persistence:** Node's built-in `node:sqlite` (`DatabaseSync`). No
  `better-sqlite3`, no native build step. A module-level singleton (`lib/db.ts`)
  survives dev hot-reloads via `globalThis`.

## Directory map

```
app/
  layout.tsx              root layout: header (logo + title) + bottom nav
  globals.css             "Control Room" dark theme; all design tokens here
  nav.tsx                 bottom tab bar (client)
  page.tsx                Board: podium, overall standings, matrix, activity
  leaderboard.tsx         shared ranked-rows component
  score/page.tsx          score hub: pick a tournament to enter scores
  teams/page.tsx          team CRUD + circuit assignment
  tournaments/page.tsx    tournament list + create form
  tournaments/tournament-form.tsx   create/edit form (client; conditional fields)
  tournaments/[id]/page.tsx         tournament detail (facilitator): leaderboard + score entry only
  tournaments/[id]/edit/page.tsx    tournament settings (admin): edit form + delete
lib/
  db.ts                   connection singleton + migration runner + SCHEMA_VERSION
  types.ts                Team / Tournament / ScoreValue / config shapes
  scoring.ts              metric per type, ranking, placement points, parsers
  data.ts                 read queries (typed) + overall standings + activity
  actions.ts              server actions (write): teams, tournaments, scores
scripts/seed.mjs          demo data (WIPES ./data)
public/insurely-logo.png  header logo
deploy/                   LXC/systemd deploy: install.sh, update.sh, .service unit
Dockerfile, docker-compose.yml   alternative container deploy
```

## Data model

Three tables (see `lib/db.ts` migration 1). JSON is stored in TEXT columns and
parsed in `lib/data.ts`.

- **teams** `(id, name, members JSON string[], circuit 'A'|'B'|NULL, sort)`
- **tournaments** `(id, name, type, weight, config JSON, sort)`
- **scores** `(id, tournament_id, team_id, value JSON, updated_at)` —
  `UNIQUE(tournament_id, team_id)`, upserted on save, FK `ON DELETE CASCADE`.
- **settings** `(key, value)` (migration 2) — key/value store. Currently holds
  `public_leaderboard` (`'1'`/`'0'`), default `'0'`.

`type` ∈ `points | time | guesstimate | checkpoints`. JSON shapes by type:

| type        | tournament `config`                       | score `value`            |
| ----------- | ----------------------------------------- | ------------------------ |
| points      | `{}`                                      | `{ value: number }`      |
| time        | `{}`                                      | `{ seconds: number }`    |
| guesstimate | `{ targets: number[] }` (3 questions)     | `{ answers: number[] }`  |
| checkpoints | `{ circuitA: number[], circuitB: number[] }` (6 each, 0–99) | `{ found: number[] }` |

## Scoring rules (`lib/scoring.ts`)

`teamMetric()` turns a score into a comparable number; `rankTournament()` sorts,
handles ties, and assigns placement points.

- **points** — metric = value, higher better.
- **time** — metric = seconds, lower better. `parseTime` accepts `m:ss` or raw seconds.
- **guesstimate** — metric = Σ |answer_i − target_i| over the 3 questions, lower
  better. Blank answers are skipped (count as 0 distance). One placement for the
  whole tournament.
- **checkpoints** — each team scored only against **its own circuit** (`team.circuit`,
  default A). Metric = count of found numbers present in that circuit's correct
  set (deduped, order ignored), higher better.
- **placement points** — base = total team count N: 1st→N, last→1. Tied teams
  share the average of the positions they occupy. Multiplied by `tournament.weight`.
- **overall** — sum of weighted placement points across all tournaments
  (`getOverallStandings` in `lib/data.ts`).

## Schema version & migrations

Version is tracked in `PRAGMA user_version` (integer). `user_version = 1` is
schema **v1.0**. `MIGRATIONS` in `lib/db.ts` is an ordered list; on boot the app
runs every migration with `version > user_version`, each in a transaction, then
stamps the new version. Fresh DB → built straight to latest; old DB → upgraded
in place, data preserved. `SCHEMA_VERSION` (exported) = highest known version.

### Changing the schema

**Every schema change is a migration. Never edit migration 1; never hand-alter a
live database.**

1. Append a new object to `MIGRATIONS` in `lib/db.ts`:
   ```ts
   {
     version: 2,
     name: 'add teams.color',
     up(db) {
       db.exec("ALTER TABLE teams ADD COLUMN color TEXT");
     },
   }
   ```
   Use the next integer. Prefer additive, idempotent-friendly changes
   (`ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`, backfills). For a table rewrite,
   do the SQLite 12-step dance (create new, copy, drop, rename) inside `up()`.
2. Update the TS types in `lib/types.ts` and any read mapping in `lib/data.ts`
   and writes in `lib/actions.ts`.
3. Bump the version reference in `README.md` if you cross a notable boundary
   (e.g. v1.0 → v2.0).
4. Test against a copy of a real DB: point `DB_PATH` at it, boot, confirm
   `PRAGMA user_version` advanced and data survived.

The runner only moves forward — there are no down-migrations. To roll back,
restore a backup (see README → Data & backups).

## Conventions & gotchas

- **No monospace fonts** (looked "AI-ish"). The `--mono` CSS var resolves to the
  sans stack; numbers use `font-variant-numeric: tabular-nums` for alignment.
- **`node:sqlite` cannot run in a transaction with** `PRAGMA journal_mode` /
  `foreign_keys` — those are set outside `migrate()` in `init()`.
- `PRAGMA user_version = N` can't be parameterized; `N` is inlined from a
  trusted integer in code.
- Server Actions read `FormData`; helpers in `lib/actions.ts`
  (`parseCheckpoints`, `readNumberedNumbers`) validate/clamp inputs.
- `mockups/` holds the original static design explorations (Big Board, Quick
  Entry) — not part of the running app. The chosen design is "Control Room".
- `scripts/seed.mjs` **deletes `./data`** before seeding — never run against prod.
- Runtime is `next start` (`npm start`) everywhere — systemd unit and Docker.

## Commands

```bash
npm run dev                  # local dev, :3000
npm run build && npm start   # production build + serve
node scripts/seed.mjs        # demo data (wipes ./data)
sudo bash deploy/install.sh  # LXC/systemd first-time deploy (Node >= 24)
bash deploy/update.sh        # pull + rebuild + restart
docker compose up -d --build # alternative: container deploy
sqlite3 data/conference.db 'PRAGMA user_version;'   # check schema version
```

## Deploy targets

- **Primary: Ubuntu LXC + systemd, no Docker.** The LXC is the container; Docker
  inside it only adds nesting config + overhead. `npm start` (= `next start`)
  runs the build under a systemd unit (`deploy/`). Needs Node ≥ 24 for unflagged
  `node:sqlite`.
- **Alternative: Docker.** Same `next start` runtime (`npm start`) in the image,
  dev deps pruned. Use on hosts already running Docker or for a portable image.
  (No `output: 'standalone'` — the build matches the `next start` runtime, which
  avoids the "next start does not work with output: standalone" warning.)
- Both read/write the same SQLite file via `DB_PATH`; migrations run on boot
  either way.
