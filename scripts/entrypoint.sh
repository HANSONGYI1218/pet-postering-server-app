#!/bin/sh
set -euo pipefail

log() {
  echo "[entrypoint] $1"
}

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  log "running Prisma migrations"
  npx prisma migrate deploy
else
  log "skipping Prisma migrations (SKIP_MIGRATE=${SKIP_MIGRATE:-})"
fi

log "starting application: $*"
exec "$@"
