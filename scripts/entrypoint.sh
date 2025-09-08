#!/usr/bin/env sh
set -eu

# Enable shell trace when requested
if [ "${ENTRYPOINT_DEBUG:-0}" = "1" ]; then
  set -x
fi

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

# Optional startup sleep to surface early logs
if [ -n "${ENTRYPOINT_SLEEP:-}" ] && [ "${ENTRYPOINT_SLEEP}" != "0" ]; then
  log "Sleeping for ${ENTRYPOINT_SLEEP}s before start..."
  sleep "${ENTRYPOINT_SLEEP}"
fi

# Optionally skip migrations to isolate startup issues
if [ "${SKIP_MIGRATE:-0}" = "1" ]; then
  log "SKIP_MIGRATE=1 set; skipping prisma migrate deploy"
else
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
fi

log "Starting application: $*"
exec "$@"
