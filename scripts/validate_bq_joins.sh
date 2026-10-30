#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/validate_bq_common.sh"
works=$(table_name works)
cte="WITH sampled AS (SELECT authorships, primary_location, primary_topic FROM \`$works\` TABLESAMPLE SYSTEM ($SAMPLE_PCT PERCENT) LIMIT $SAMPLE_WORKS)"

failed=0
for rel in authors institutions sources topics; do
  case "$rel" in
    authors) ref="SELECT au.author.id AS ref_id FROM sampled w CROSS JOIN UNNEST(w.authorships) au WHERE au.author.id IS NOT NULL" ;;
    institutions) ref="SELECT i.id AS ref_id FROM sampled w CROSS JOIN UNNEST(w.authorships) au CROSS JOIN UNNEST(au.institutions) i WHERE i.id IS NOT NULL" ;;
    sources) ref="SELECT primary_location.source.id AS ref_id FROM sampled WHERE primary_location.source.id IS NOT NULL" ;;
    topics) ref="SELECT primary_topic.id AS ref_id FROM sampled WHERE primary_topic.id IS NOT NULL" ;;
  esac
  
  sql="$cte, refs AS ($ref)
SELECT 'works_to_$rel' AS relationship, COUNT(*) AS refs_checked,
 COUNTIF(e.id IS NOT NULL) AS matched, COUNTIF(e.id IS NULL) AS unmatched,
 ROUND(100*SAFE_DIVIDE(COUNTIF(e.id IS NOT NULL), COUNT(*)),2) AS match_pct
FROM refs r LEFT JOIN \`$(table_name "$rel")\` e ON r.ref_id=e.id"
  run_check_sql "Works → $rel" "$sql" || failed=1

done

exit "$failed"