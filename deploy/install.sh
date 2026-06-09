#!/usr/bin/env bash
# First-time deploy on an Ubuntu LXC (or any systemd host) — no Docker.
# Clone the repo to e.g. /opt/conference-scoring, then run this from there:
#   sudo bash deploy/install.sh
set -euo pipefail

SERVICE=conference-scoring
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
PORT="${PORT:-3000}"
cd "$APP_DIR"

# node:sqlite is unflagged from Node 24 onward.
if ! node -e 'process.exit((+process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' 2>/dev/null; then
  echo "ERROR: Node >= 24 required (built-in node:sqlite)."
  echo "Install it, e.g.:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Writing systemd unit (/etc/systemd/system/${SERVICE}.service)"
sudo tee "/etc/systemd/system/${SERVICE}.service" >/dev/null <<EOF
[Unit]
Description=Conference Scoring (Next.js)
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=DB_PATH=${APP_DIR}/data/conference.db
ExecStart=$(command -v npm) start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE}"

echo "==> Done. App on :${PORT}. Point your Cloudflare tunnel there."
echo "    Logs:    journalctl -u ${SERVICE} -f"
echo "    Status:  systemctl status ${SERVICE}"
