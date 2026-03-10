#!/bin/sh
set -e

echo "[ENTRYPOINT] Running database migrations..."
node scripts/migrate.mjs

echo "[ENTRYPOINT] Starting server..."
exec node server.js
