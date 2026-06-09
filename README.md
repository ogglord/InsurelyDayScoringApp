# Conference Scoring

Mobile-first web app to run an Insurely conference of mini tournaments between
teams. Two organizers manage everything from their phones; a shared live board
shows standings.

Built with **Next.js (App Router)** + Node's built-in **`node:sqlite`** — no
native modules to compile, no external database server.

---

## Features

- **Teams** — create/edit/delete teams + their members; assign an orienteering
  circuit (A or B) per team.
- **Tournaments** — name + scoring type + weight. Four scoring types:
  - `points` — higher wins (e.g. Music Quiz)
  - `time` — lower wins; enter `m:ss` or seconds (e.g. Puzzle)
  - `guesstimate` — **3 questions** per tournament; score = total distance from
    the correct answers, lowest wins
  - `checkpoints` — orienteering; each team scored against its own circuit's
    6 checkpoints (0–99), 1 point per correct, order ignored
- **Score entry** — per team per tournament, fully editable.
- **Live board** — podium (top 3), overall standings, per-tournament placement
  matrix, recent-activity feed.

## Scoring model

Within each tournament, teams are ranked by that type's metric. Rank →
**placement points**: 1st = N (number of teams) down to 1 for last; ties share
the average. Placement points are multiplied by the tournament **weight**
(default 1.0) and summed across all tournaments for the overall standing.

---

## Quick start (local dev)

```bash
npm install
npm run dev          # http://localhost:3000
```

Data is stored in `./data/conference.db` (override with `DB_PATH`).

### Demo data

```bash
node scripts/seed.mjs   # WARNING: wipes ./data first, then inserts 6 teams,
                        # 4 tournaments and sample scores
```

---

## Production deploy

Two options. On a single-purpose **Ubuntu LXC**, the recommended path is
systemd directly (no Docker) — the LXC is already your container, so Docker just
adds nesting config and overhead. Docker remains available for hosts that prefer
images.

> **No auth by default** — keep the tunnel URL private. To lock it down, put
> **Cloudflare Access** in front of the tunnel (email/Google login, no app
> changes needed).

### A) Ubuntu LXC + systemd (recommended)

Requires **Node ≥ 24** (built-in `node:sqlite`, no flag):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

Then:

```bash
sudo git clone <repo-url> /opt/conference-scoring
cd /opt/conference-scoring
sudo bash deploy/install.sh      # installs deps, builds, writes + starts the systemd unit
```

- App listens on `:3000`; SQLite file at `/opt/conference-scoring/data/conference.db`.
- Point your Cloudflare tunnel at `http://localhost:3000`.
- Auto-starts on boot, restarts on crash (systemd).

Update after code changes:

```bash
cd /opt/conference-scoring && bash deploy/update.sh   # pull, rebuild, restart
journalctl -u conference-scoring -f                   # tail logs
systemctl status conference-scoring
```

DB migrations run automatically on restart.

### B) Docker (alternative)

```bash
docker compose up -d --build      # build image + start, data in ./data (volume)
docker compose logs -f            # tail logs
docker compose down               # stop (data persists in ./data)
```

App on `:3000`, SQLite persisted in `./data`. `restart: unless-stopped` brings
it back after reboot once the Docker engine is up.

---

## Configuration

| Env var   | Default                 | Purpose                              |
| --------- | ----------------------- | ------------------------------------ |
| `DB_PATH` | `./data/conference.db`  | SQLite file location (`:memory:` ok) |
| `PORT`    | `3000`                  | HTTP port                            |

In Docker these are set in `Dockerfile` / `docker-compose.yml`
(`DB_PATH=/data/conference.db`, volume `./data:/data`).

---

## Data & backups

The whole app state is one SQLite file. WAL mode is on, so a live DB also has
`-wal` / `-shm` sidecar files.

```bash
# Backup (safe while running):
sqlite3 data/conference.db ".backup 'backup-$(date +%F).db'"

# Or simply stop and copy the file:
docker compose down && cp data/conference.db backup.db
```

Restore = put the file back at `DB_PATH` and start the app.

---

## Database schema versioning & migrations

The schema is **versioned**, starting at **v1.0**. The version is stored in
SQLite's `PRAGMA user_version` (integer; `1` == v1.0) and migrations run
automatically on boot.

- Current version lives in code as `SCHEMA_VERSION` (see `lib/db.ts`).
- On startup the app applies every migration whose version is greater than the
  database's current `user_version`, each in its own transaction.
- A fresh database is built straight to the latest version; an older one is
  upgraded in place. Existing data is preserved.

**Any schema change from now on must be a migration** — never edit migration 1
or hand-alter a live database. See [CLAUDE.md](CLAUDE.md#changing-the-schema)
for the step-by-step.

Check a database's version:

```bash
sqlite3 data/conference.db 'PRAGMA user_version;'
```

---

## Logo

The Insurely logo is served from `public/insurely-logo.png` and shown in the
header on every page. Replace that file to change it.

---

## Troubleshooting

- **`failed to connect to the docker API ... docker.sock: no such file`** — the
  Docker engine isn't running. Start OrbStack (or Docker Desktop), then retry.
- **`Port 3000 is in use`** — something already holds it:
  `lsof -ti :3000 | xargs kill -9`, or stop the container with
  `docker compose down`.
- **Build error `Cannot find module for page: /_document`** — stale build
  cache; `rm -rf .next && npm run build`.

See [CLAUDE.md](CLAUDE.md) for architecture and maintenance details.
