#!/usr/bin/env bash
# update.sh — one-click update: pull latest + restart PM2
set -e

cd "$(dirname "$0")"

PORT="${PORT:-3003}"
NAME="${PM2_NAME:-windsurf-api}"

echo "=== [1/4] Pull latest ==="
git fetch --quiet origin
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  echo "    已是最新 / Already up to date"
else
  echo "    $BEFORE → $AFTER"
  git log --oneline "$BEFORE..$AFTER" | head -10
fi

echo ""
echo "=== [2/4] Stop service ==="
pm2 stop "$NAME" >/dev/null 2>&1 || true
pm2 delete "$NAME" >/dev/null 2>&1 || true
fuser -k "$PORT"/tcp >/dev/null 2>&1 || true
pkill -f "node.*WindsurfAPI/src/index.js" >/dev/null 2>&1 || true

# Wait for port to actually free up (max 30s)
for i in $(seq 1 30); do
  if ! ss -ltn 2>/dev/null | grep -q ":$PORT "; then break; fi
  sleep 1
done

echo ""
echo "=== [3/4] Start service ==="
pm2 start src/index.js --name "$NAME" --cwd "$(pwd)"
pm2 save >/dev/null 2>&1 || true

echo ""
echo "=== [4/4] Health check ==="
sleep 3
if curl -sf "http://localhost:$PORT/health" | head -200; then
  echo ""
  echo ""
  echo "✓ Update complete. Dashboard: http://\$YOUR_IP:$PORT/dashboard"
else
  echo ""
  echo "✗ Health check failed. Check 'pm2 logs $NAME' for details."
  exit 1
fi
