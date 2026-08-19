#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALITIES = ROOT / "public" / "data" / "nz-suburbs-localities.geojson"
RESOLVED = ROOT / "data" / "participants" / "resolved"
OUTDIR = ROOT / "data" / "participants" / "baseline"

TARGETS = {
    "Auckland": RESOLVED / "participants-auckland-located-002-resolved-001.json",
    "Bay of Plenty Region": RESOLVED / "participants-bay-of-plenty-located-003-resolved-001.json",
}

PATCHES = {
    "aotea-great-barrier-environmental-trust": {
        "sourceLocalities": ["Aotea / Great Barrier Island"],
        "mapCandidates": ["Great Barrier Island", "Aotea"],
        "resolutionClass": "SOURCE_LOCATED_ISLAND_WIDE",
        "basis": "Organisation mission is explicitly Aotea / Great Barrier Island-wide.",
    },
    "aotea-trap-library": {
        "sourceLocalities": ["Aotea / Great Barrier Island"],
        "mapCandidates": ["Great Barrier Island", "Aotea"],
        "resolutionClass": "SOURCE_LOCATED_ISLAND_WIDE",
        "basis": "Trap library serves residents and community projects across Aotea / Great Barrier Island.",
    },
    "auckland-invasive-weeds-group": {
        "sourceLocalities": ["Auckland Region"],
        "mapCandidates": [],
        "resolutionClass": "REGION_WIDE",
        "basis": "Group operates at Auckland-wide scale; no narrower locality is safely evidenced.",
    },
    "auckland-king-tides-initiative": {
        "sourceLocalities": ["Auckland Region coastline"],
        "mapCandidates": [],
        "resolutionClass": "REGION_WIDE_COASTAL",
        "basis": "Initiative operates across Auckland coastal communities rather than one locality.",
    },
    "bop-violet-pou": {
        "sourceLocalities": ["Te Kinakina Wetlands", "Te Kaha"],
        "mapCandidates": ["Te Kaha"],
        "resolutionClass": "SOURCE_LOCATED_PROJECT_AREA",
        "basis": "Public project evidence ties Violet Pou to Te Kinakina Wetlands near Te Kaha, Eastern Bay of Plenty.",
    },
    "bop-bill-kerrison": {
        "sourceLocalities": ["Waiohau", "Rangitāiki River"],
        "mapCandidates": ["Waiohau"],
        "resolutionClass": "SOURCE_LOCATED_RIVER_SYSTEM",
        "basis": "Public conservation evidence identifies Bill Kerrison as a Waiohau local working on tuna in the Rangitāiki River system.",
    },
}

def key(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", value or "")
        if not unicodedata.combining(c)
    ).casefold().strip()

def load_locality_index():
    data = json.loads(LOCALITIES.read_text(encoding="utf-8"))
    by_region = {}
    for f in data.get("features", []):
        p = f.get("properties") or {}
        region = p.get("region")
        name = p.get("name") or p.get("major_name")
        if region and name:
            by_region.setdefault(region, {})[key(str(name))] = str(name)
    return by_region

def main():
    index = load_locality_index()
    OUTDIR.mkdir(parents=True, exist_ok=True)

    patched_ids = set()
    outputs = []

    for region, src in TARGETS.items():
        if not src.exists():
            raise SystemExit(f"Missing resolved dataset: {src}")

        payload = json.loads(src.read_text(encoding="utf-8"))
        out_payload = copy.deepcopy(payload)

        for p in out_payload.get("participants", []):
            pid = p.get("id")
            patch = PATCHES.get(pid)
            if not patch:
                continue

            source_localities = patch["sourceLocalities"]
            map_localities = []

            for candidate in patch["mapCandidates"]:
                resolved = index.get(region, {}).get(key(candidate))
                if resolved and resolved not in map_localities:
                    map_localities.append(resolved)

            p["localities"] = source_localities
            p["mapLocalities"] = map_localities
            p["localityResolution"] = {
                "version": "baseline-001",
                "status": patch["resolutionClass"],
                "basis": patch["basis"],
                "mapLocalities": map_localities,
            }
            patched_ids.add(pid)

            print(
                f"{pid}: source={source_localities} "
                f"map={map_localities or '[]'} "
                f"class={patch['resolutionClass']}"
            )

        out_name = src.name.replace("-resolved-001.json", "-baseline-001.json")
        target = OUTDIR / out_name
        target.write_text(
            json.dumps(out_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        outputs.append(target)

    missing = set(PATCHES) - patched_ids
    if missing:
        raise SystemExit(
            "Patch IDs not found in resolved datasets:\n  " + "\n  ".join(sorted(missing))
        )

    print()
    print("EX GAMES LIVING MAP — SIX NO-GEOGRAPHY RECORDS RESOLVED")
    print("=" * 76)
    print(f"Patched records: {len(patched_ids)}")
    for path in outputs:
        print(f"Output: {path.relative_to(ROOT)}")
    print("Resolved source files were not overwritten.")
    print("No locality or coordinate was invented.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
