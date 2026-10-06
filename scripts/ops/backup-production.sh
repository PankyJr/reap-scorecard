#!/usr/bin/env bash
# Full schema + data dump of the PRODUCTION Supabase project to ./backups/.
#
# Needs the database password in a git-ignored file, one line:
#   .env.prod-dump.local   ->   PGPASSWORD=<database password>
# (Supabase dashboard: Project Settings > Database > Database password.)
#
# Uses the session pooler (port 5432), which is what pg_dump needs. Requires a
# pg_dump whose major version is at least the server's (Postgres 17).
set -euo pipefail
cd "$(dirname "$0")/../.."

REF="pmjuiynjelhjlpyohbvk"
HOST="aws-1-eu-central-1.pooler.supabase.com"
PORT=5432
USER="postgres.${REF}"
DB="postgres"

if [ ! -f .env.prod-dump.local ]; then
  echo "Missing .env.prod-dump.local (PGPASSWORD=...). See the header of this script." >&2
  exit 1
fi
set -a; . ./.env.prod-dump.local; set +a
: "${PGPASSWORD:?PGPASSWORD is empty}"
export PGPASSWORD

PG_DUMP="${PG_DUMP:-/opt/homebrew/opt/postgresql@17/bin/pg_dump}"
[ -x "$PG_DUMP" ] || PG_DUMP="$(command -v pg_dump)"

mkdir -p backups
OUT="backups/reap-prod-$(date +%Y%m%d-%H%M).sql"

echo "Dumping ${REF} via ${HOST}:${PORT} -> ${OUT}"
"$PG_DUMP" \
  --host="$HOST" --port="$PORT" --username="$USER" --dbname="$DB" \
  --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --file="$OUT"

echo
echo "Wrote $(wc -c < "$OUT" | tr -d ' ') bytes"
for t in procurement_assessments procurement_suppliers procurement_results companies; do
  has_table=$(grep -c "CREATE TABLE public.${t} " "$OUT" || true)
  rows=$(awk -v t="public.${t} " '
    $0 ~ "^COPY " t {copying=1; next}
    copying && $0 == "\\." {copying=0}
    copying {n++}
    END {print n+0}' "$OUT")
  printf "  %-28s CREATE TABLE: %s   rows in COPY: %s\n" "$t" "$has_table" "$rows"
done
echo
echo "backups/ is git-ignored. Do not move this file into the repo."
