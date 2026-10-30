#!/usr/bin/env bash

# shared settings for BigQuery upload checks. Sourced from repository root.
set -euo pipefail
for cmd in bq jq; do 
    command -v "$cmd" >/dev/null || { echo "ERROR: $cmd is required" >&2; exit 1; }; 
done
: "${PROJECT_ID:?PROJECT_ID must be set in .env}"
: "${BQ_DATASET:?BQ_DATASET must be set in .env}"
BQ_LOCATION="${BQ_LOCATION:-US}"

# bq.sh currently loads unsuffixed table names; optional override for older snapshots.
BQ_TABLE_SUFFIX="${BQ_TABLE_SUFFIX:-}"
MAX_BYTES_BILLED="${MAX_BYTES_BILLED:-50737418240}"
SAMPLE_PCT="${SAMPLE_PCT:-1}"
SAMPLE_WORKS="${SAMPLE_WORKS:-1000}"
EXECUTE="${EXECUTE:-1}"
[[ "$MAX_BYTES_BILLED" =~ ^[0-9]+$ ]] || { echo 'Invalid MAX_BYTES_BILLED' >&2; exit 1; }
[[ "$SAMPLE_PCT" =~ ^[0-9]+$ ]] && (( SAMPLE_PCT >= 1 && SAMPLE_PCT <= 100 )) || { echo 'SAMPLE_PCT must be an integer between 1 and 100' >&2; exit 1; }
[[ "$SAMPLE_WORKS" =~ ^[0-9]+$ ]] && (( SAMPLE_WORKS >= 1 )) || { echo 'SAMPLE_WORKS must be positive' >&2; exit 1; }
table_name() { printf '%s.%s.%s%s' "$PROJECT_ID" "$BQ_DATASET" "$1" "$BQ_TABLE_SUFFIX"; }

run_check_sql() {
  local label="$1" sql="$2"
  echo "--- $label ---"
  if ! bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" query \
       --nouse_legacy_sql --dry_run --format=prettyjson "$sql" >/dev/null; then
    echo "FAIL: $label (dry run)" >&2; return 1
  fi

  if [[ "$EXECUTE" != 1 ]]; then 
    echo 'DRY RUN ONLY (set EXECUTE=1 to execute)'
    echo "$sql"
    echo

    local output bytes
    if ! output=$(bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" query \
        --nouse_legacy_sql \
        --dry_run \
        "$sql" 2>&1); then
        echo "$output" >&2
        echo "FAIL: $label" >&2
        return 1
    fi

    bytes=$(echo "$output" | sed -nE \
        's/.*process ([0-9]+) bytes of data.*/\1/p')

    if [[ -n "$bytes" ]]; then
        awk -v bytes="$bytes" 'BEGIN {
            printf "Estimated data processed: %.2f MB\n", bytes / 1000000
        }'
    else
        echo "$output"
    fi

    return 0
  fi

  if ! bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" query \
       --nouse_legacy_sql --format=prettyjson --max_rows=100 \
       --maximum_bytes_billed="$MAX_BYTES_BILLED" "$sql"; then
    echo "FAIL: $label (possibly exceeded MAX_BYTES_BILLED)" >&2; return 1
  fi
}