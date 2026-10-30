#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/validate_bq_common.sh"

# TABLESAMPLE uses storage blocks and is not a statistically representative random sample.
# Restrict to a small sample of each large table; smaller tables are checked entirely.
failed=0
for spec in 'authors:A' 'awards:G' 'concepts:C' 'domains:D' 'fields:f' 'funders:F' 'institutions:I' 'publishers:P' 'sources:S' 'subfields:f' 'topics:T' 'works:W'; do
  
  ds="${spec%%:*}"
  pct="$SAMPLE_PCT"
  
  case "$ds" in domains|fields|subfields|topics) pct=100 ;; esac
  
  # Only assert universal OpenAlex ID form here; prefixes vary across entity vintages.
  sql="
    SELECT
    '$ds' AS entity,
    COUNT(*) AS total_rows,
    COUNTIF(id IS NULL) AS null_ids,
    COUNTIF(
        id IS NOT NULL
        AND NOT STARTS_WITH(id, 'https://openalex.org/')
    ) AS bad_openalex_urls,
    COUNT(*) - COUNT(DISTINCT id) - COUNTIF(id IS NULL)
        AS duplicate_non_null_ids
    FROM \`${PROJECT_ID}.${BQ_DATASET}.${ds}\`
    "
  
  # TABLESAMPLE is not allowed on some external table kinds; all uploaded entities should be native tables.
  run_check_sql "IDs: $ds" "$sql" || failed=1
done

exit "$failed"