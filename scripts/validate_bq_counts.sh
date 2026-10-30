#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/validate_bq_common.sh"

DATASETS=(authors awards concepts domains fields funders institutions publishers sources subfields topics works)
printf '%-16s %18s %18s %8s\n' 'TABLE' 'BQ_ROWS' 'MANIFEST_ROWS' 'STATUS'

failed=0
for ds in "${DATASETS[@]}"; do
  tn="${ds}${BQ_TABLE_SUFFIX}"
  metadata=$(bq --project_id="$PROJECT_ID" --format=json show "${PROJECT_ID}:${BQ_DATASET}.${tn}" 2>/dev/null) || { printf '%-16s %18s %18s %8s\n' "$tn" '-' '-' 'MISSING'; failed=1; continue; }
  
  rows=$(jq -r '.numRows // empty' <<< "$metadata")
  [[ "$rows" =~ ^[0-9]+$ ]] || { echo "Invalid numRows for $tn" >&2; failed=1; continue; }
  
  manifest="data/raw/${VERSION}/${ds}/manifest.json"
  if [[ -f "$manifest" ]]; then
    expected=$(jq -r '.record_count // empty' "$manifest")
    if [[ "$expected" =~ ^[0-9]+$ ]]; then
      if [[ "$rows" == "$expected" ]]; then status=PASS; else status=MISMATCH; failed=1; fi
    else expected='?'; status=INVALID_MANIFEST; failed=1; fi
  else
    expected='-'; status=NO_MANIFEST
  fi
  printf '%-16s %18s %18s %8s\n' "$tn" "$rows" "$expected" "$status"
done

exit "$failed"