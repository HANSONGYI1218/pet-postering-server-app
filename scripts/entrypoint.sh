#!/bin/sh
set -euo pipefail

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  echo "Running prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "Skipping Prisma migrations (SKIP_MIGRATE=${SKIP_MIGRATE:-})"
fi

echo "Starting application: $*"
exec "$@"
