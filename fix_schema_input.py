
import json
import sys

for line in sys.stdin:
    record = json.loads(line)

    for source in record.get("sources") or []:
        if source.get("issn") is None:
            source["issn"] = []

    print(json.dumps(record, ensure_ascii=False))
