#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "geography" / "staged" / "four-region-area-geometry-queue-001.json"

data = json.loads(SRC.read_text(encoding="utf-8"))

rows = [
    r for r in data.get("queue", [])
    if r.get("region") == "Northland Region" and r.get("priority") == "A"
]

rows.sort(key=lambda r: (-int(r.get("participantCount", 0)), r.get("areaType", ""), r.get("name", "").casefold()))

print("EX GAMES LIVING MAP — NORTHLAND PRIORITY A GEOMETRY QUEUE")
print("=" * 76)
print(f"Count: {len(rows)}")
print()

for i, r in enumerate(rows, 1):
    print(
        f"{i:02d}. {r['name']} | "
        f"{r['areaType']} | "
        f"participants={r.get('participantCount', 0)} | "
        f"id={r['areaId']}"
    )

print()
print("Suggested source classes:")
for r in rows:
    hints = "; ".join(r.get("suggestedSourceClasses", []))
    print(f"  {r['name']}: {hints}")
