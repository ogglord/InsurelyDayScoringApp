#!/usr/bin/env bash
# Pull latest code, rebuild, restart. DB migrations run automatically on boot.
#   bash deploy/update.sh
set -euo pipefail

SERVICE=conference-scoring
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> Pulling"
git pull --ff-only

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Restarting ${SERVICE}"
sudo systemctl restart "${SERVICE}"

echo "==> Done. Migrations applied on restart. Logs: journalctl -u ${SERVICE} -f"
