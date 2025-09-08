#!/usr/bin/env sh
set -eu

log() { printf "[entrypoint] %s\n" "$*"; }
redact_url() {
  # mask credentials in URLs for logs
  echo "$1" | sed -E 's#(://)[^:@/]+(:[^@/]+)?@#\1***:***@#'
}

append_sslmode_require() {
  IN="$1"
  echo "$IN" | grep -qi 'sslmode=' && { echo "$IN"; return; }
  echo "$IN" | grep -q '?' && { echo "${IN}&sslmode=require"; return; }
  echo "${IN}?sslmode=require"
}

# Prefer DIRECT_DATABASE_URL for migrations; fallback to DATABASE_URL
MIG_URL="${DIRECT_DATABASE_URL:-}"
if [ -z "${MIG_URL}" ]; then
  MIG_URL="${DATABASE_URL:-}"
fi

if [ -n "${MIG_URL}" ]; then
  MIG_URL=$(append_sslmode_require "$MIG_URL")
  log "Running prisma migrate deploy against: $(redact_url "$MIG_URL")"
  # Do not permanently override env; only for this process
  DATABASE_URL="$MIG_URL" npx prisma migrate deploy
else
  log "No DIRECT_DATABASE_URL/DATABASE_URL provided; skipping migrations"
fi

log "Starting application: $*"
exec "$@"

