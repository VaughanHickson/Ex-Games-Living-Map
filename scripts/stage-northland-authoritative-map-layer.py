#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TAKOU = ROOT / "data" / "geography" / "staged" / "northland-authoritative-areas-001.geojson"
PUKETI = ROOT / "data" / "geography" / "staged" / "northland-puketi-omahuta-authoritative-002.geojson"

OUT = ROOT / "public" / "data" / "dev-northland-authoritative-areas.geojson"
BACKUP = ROOT / "data" / "geography" / "staged" / "dev-northland-authoritative-areas.geojson"

def load_features(path: Path):
    if not path.exists():
        raise SystemExit(f"Missing {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("features", [])

def main():
    features = []
    features.extend(load_features(TAKOU))
    features.extend(load_features(PUKETI))

    payload = {
        "type": "FeatureCollection",
        "features": features,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    BACKUP.parent.mkdir(parents=True, exist_ok=True)

    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    OUT.write_text(text, encoding="utf-8")
    BACKUP.write_text(text, encoding="utf-8")

    print("EX GAMES LIVING MAP — NORTHLAND AUTHORITATIVE DEV LAYER")
    print("=" * 72)
    print(f"Features: {len(features)}")
    for f in features:
        p = f.get("properties") or {}
        print(
            f"  {p.get('name')} | "
            f"{p.get('areaType')} | "
            f"{p.get('boundaryStatus')} | "
            f"{p.get('geometryStatus')}"
        )
    print()
    print(f"Public dev layer: {OUT.relative_to(ROOT)}")
    print(f"Staged backup:    {BACKUP.relative_to(ROOT)}")
    print("This is a development-only display layer.")
    print("It does not register these Areas into participant datasets or LM production registries.")

if __name__ == "__main__":
    main()
