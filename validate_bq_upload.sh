#!/usr/bin/env bash
set -euo pipefail

# can be called from any working directory.
cd "$(dirname "${BASH_SOURCE[0]}")"

if [[ ! -f .env ]]; then 
    echo 'ERROR: create .env from .env.example first' >&2; exit 1; 
fi

set -a
source .env
set +a
: "${VERSION:?Set VERSION in .env}"

printf 'OpenAlex BigQuery upload validation\nProject: %s | Dataset: %s | Snapshot: %s\n\n' "$PROJECT_ID" "$BQ_DATASET" "$VERSION"
failed=0

printf '=== 1. Row counts (no data scan) ===\n'

bash scripts/validate_bq_counts.sh || failed=1
printf '\n=== 2. ID checks (sampled; capped query billing) ===\n'

bash scripts/validate_bq_ids.sh || failed=1
printf '\n=== 3. Works joins (sampled works; capped query billing) ===\n'

bash scripts/validate_bq_joins.sh || failed=1

if (( failed )); then 
    echo 'VALIDATION INCOMPLETE: see failures above' >&2; exit 1; 
fi

echo 'Validation commands completed; inspect the displayed match rates and null counts.'