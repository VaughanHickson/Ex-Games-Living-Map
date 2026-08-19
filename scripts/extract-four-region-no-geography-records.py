#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "geography" / "staged" / "four-region-launch-baseline-audit-003.json"
OUT = ROOT / "data" / "geography" / "staged" / "four-region-no-geography-review-001.json"

def main():
    if not SRC.exists():
        raise SystemExit(f"Missing audit file: {SRC}")

    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows = [
        r for r in data.get("actionRecords", [])
        if r.get("status") == "NO_GEOGRAPHY"
    ]

    payload = {
        "schema": "EXG-LM-FOUR-REGION-NO-GEOGRAPHY-REVIEW-001",
        "source": str(SRC.relative_to(ROOT)),
        "count": len(rows),
        "records": rows,
        "reviewPolicy": {
            "preferredOutcome": "explicit_source_geography_if_evidenced",
            "acceptableFallback": "region_only_if_identity_and_region_membership_are_evidenced",
            "doNotInventLocality": True,
            "doNotInventCoordinates": True,
        },
    }

    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("EX GAMES LIVING MAP — NO-GEOGRAPHY REVIEW")
    print("=" * 72)
    print(f"Records requiring review: {len(rows)}")
    print()

    for i, row in enumerate(rows, 1):
        print(
            f"{i:02d}. {row.get('name')} | "
            f"{row.get('region')} | "
            f"id={row.get('id')}"
        )

    print()
    print(f"Output: {OUT.relative_to(ROOT)}")
    print("No participant data was modified.")

if __name__ == "__main__":
    main()
