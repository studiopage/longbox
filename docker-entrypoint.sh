#!/bin/sh
set -e

echo "[ENTRYPOINT] Running schema push..."
# drizzle-kit push is idempotent — diffs schema against DB, applies only changes
# Pipe 'yes' to auto-confirm any prompts
cd /app/migrate
yes 2>/dev/null | npx drizzle-kit push --config=drizzle.config.mjs || {
  echo "[ENTRYPOINT] Schema push failed, but continuing startup..."
}

echo "[ENTRYPOINT] Starting server..."
cd /app
exec node server.js
