# LXC setup instructions (for the Claude agent on the box)

Goal: get **Conference Scoring** running on this Ubuntu LXC and exposed at
`https://scoring.ogglord.com` via a Cloudflare tunnel.

## Assumptions / what's already here

- Ubuntu LXC, you have root (or sudo).
- **Node 24** installed (`node -v` → v24.x). Built-in `node:sqlite` — no DB server needed.
- **cloudflared** installed (`cloudflared --version`), but nothing configured.
- Cloudflare account owns the domain **ogglord.com**.
- App repo (public): `https://github.com/ogglord/InsurelyDayScoringApp.git`

Pick the public hostname (default below): `scoring.ogglord.com`.

One step (`cloudflared tunnel login`) opens a browser URL — **you can't open it
on this headless box; print the URL and have the human approve it** in their
browser, then continue.

---

## Step 1 — Deploy the app

```bash
sudo git clone https://github.com/ogglord/InsurelyDayScoringApp.git /opt/conference-scoring
cd /opt/conference-scoring
sudo bash deploy/install.sh
```

`install.sh` installs deps, builds, and writes+starts a systemd unit
(`conference-scoring`) that runs the app on `:3000`, auto-starting on boot.

Verify it's serving locally before exposing it:

```bash
systemctl status conference-scoring --no-pager
curl -s -o /dev/null -w 'local app HTTP %{http_code}\n' http://localhost:3000/
```

Expect `HTTP 200`. If not, check `journalctl -u conference-scoring -e`.

> If startup logs complain that `node:sqlite` is experimental and the app
> crashes (older Node 24 minor), add `Environment=NODE_OPTIONS=--experimental-sqlite`
> to `/etc/systemd/system/conference-scoring.service`, then
> `sudo systemctl daemon-reload && sudo systemctl restart conference-scoring`.

---

## Step 2 — Cloudflare tunnel

### 2a. Authenticate (needs the human's browser, one time)

```bash
cloudflared tunnel login
```

It prints a URL. Give that URL to the human; they open it, pick **ogglord.com**,
and authorize. This writes `~/.cloudflared/cert.pem`. Wait for it to complete.

### 2b. Create the tunnel

```bash
cloudflared tunnel create conference-scoring
```

Note the **Tunnel ID** it prints and the credentials file path
`~/.cloudflared/<TUNNEL_ID>.json`.

### 2c. Route the hostname to the tunnel (creates the DNS record)

```bash
cloudflared tunnel route dns conference-scoring scoring.ogglord.com
```

### 2d. Write the config

Replace `<TUNNEL_ID>` with the real ID from 2b:

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml >/dev/null <<'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: scoring.ogglord.com
    service: http://localhost:3000
  - service: http_status:404
EOF
```

> If you ran `cloudflared tunnel login` as a non-root user, the credentials JSON
> is under that user's `~/.cloudflared/`. Either point `credentials-file` there,
> or copy it into `/root/.cloudflared/` so the system service can read it.

### 2e. Run it as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared --no-pager
```

### 2f. Verify end-to-end

```bash
curl -s -o /dev/null -w 'public HTTP %{http_code}\n' https://scoring.ogglord.com/
```

Expect `HTTP 200`. DNS may take a minute to propagate.

---

## Step 3 — Cloudflare Access (deny-by-default)

The app has **no built-in auth**. The routing is split so Access can be
deny-by-default — everything is protected except an explicit public allowlist:

- **Public (no login):** `/public` (the live standings board) and
  `/public/team/<id>` (team members), plus assets. The board only shows
  standings when an admin has enabled it — otherwise "Public leaderboard is
  currently disabled". Root `/` 307-redirects to `/public`.
- **Admin (behind Access):** everything else — `/teams`, `/score`,
  `/tournaments` (tournament settings/edit, score entry, public-board toggle).

In the Cloudflare dashboard → **Zero Trust → Access → Applications**:

1. **Protect everything:** add a **self-hosted** app for `scoring.ogglord.com`
   (path `/`), policy = allow only your + your colleague's emails.
2. **Bypass the public allowlist:** add self-hosted app(s) with an **Allow
   Everyone / Bypass** policy (higher precedence — Access matches most-specific
   path first) for:
   - `scoring.ogglord.com/public` (covers `/public` and `/public/*`)
   - `scoring.ogglord.com/_next` (Next.js CSS/JS — without this the public board
     renders unstyled/broken)
   - `scoring.ogglord.com/icon.svg` and `/insurely-logo.png` (favicon + logo)
   - `scoring.ogglord.com/` **exact** (so the root redirect to `/public` works)

Net effect: any new route is protected by default; only the public allowlist is
open. Share **`scoring.ogglord.com`** — it lands on the public board.

> The public board is also gated in-app: an admin opens **Tourneys** and toggles
> **Public leaderboard** on/off (on between rounds, off mid-tournament). When
> off, `/public` shows the disabled message even though Access lets the world
> reach it.

---

## Maintenance

```bash
# Update the app to latest code:
cd /opt/conference-scoring && bash deploy/update.sh

# Logs:
journalctl -u conference-scoring -f      # app
journalctl -u cloudflared -f             # tunnel

# Schema version (should be 1 = v1.0):
sqlite3 /opt/conference-scoring/data/conference.db 'PRAGMA user_version;'

# Backup the database (whole app state is one file):
sqlite3 /opt/conference-scoring/data/conference.db ".backup '/root/scoring-backup-$(date +%F).db'"
```

DB migrations run automatically whenever the app restarts.

---

## Quick checklist

- [ ] `git clone` + `sudo bash deploy/install.sh`
- [ ] `curl localhost:3000` → 200
- [ ] `cloudflared tunnel login` (human approves URL)
- [ ] `cloudflared tunnel create conference-scoring`
- [ ] `cloudflared tunnel route dns conference-scoring scoring.ogglord.com`
- [ ] write `/etc/cloudflared/config.yml`
- [ ] `cloudflared service install` + enable
- [ ] `curl https://scoring.ogglord.com` → 200
