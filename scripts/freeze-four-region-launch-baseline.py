#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RESOLVED = ROOT / "data" / "participants" / "resolved"
BASELINE = ROOT / "data" / "participants" / "baseline"
GEOGRAPHY = ROOT / "data" / "geography" / "staged"

TARGETS = {
    "Northland Region": RESOLVED / "participants-northland-located-002-resolved-001.json",
    "Auckland": BASELINE / "participants-auckland-located-002-baseline-001.json",
    "Waikato Region": RESOLVED / "participants-waikato-located-001-resolved-001.json",
    "Bay of Plenty Region": BASELINE / "participants-bay-of-plenty-located-003-baseline-001.json",
}

FINAL_DIR = BASELINE / "launch-001"
MANIFEST = FINAL_DIR / "manifest.json"

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def participant_count(path: Path) -> int:
    payload = json.loads(path.read_text(encoding="utf-8"))
    participants = payload.get("participants", [])
    if not isinstance(participants, list):
        raise SystemExit(f"Invalid participant array in {path}")
    return len(participants)

def main():
    FINAL_DIR.mkdir(parents=True, exist_ok=True)

    records = []
    total = 0

    for region, source in TARGETS.items():
        if not source.exists():
            raise SystemExit(f"Missing baseline source: {source}")

        count = participant_count(source)
        total += count

        destination = FINAL_DIR / source.name
        shutil.copy2(source, destination)

        records.append({
            "region": region,
            "source": str(source.relative_to(ROOT)),
            "frozenFile": str(destination.relative_to(ROOT)),
            "participantCount": count,
            "sha256": sha256(destination),
        })

    manifest = {
        "schema": "EXG-LM-FOUR-REGION-LAUNCH-BASELINE-001",
        "status": "FROZEN_FOR_LAUNCH_BASELINE",
        "regions": [
            "Northland Region",
            "Auckland",
            "Waikato Region",
            "Bay of Plenty Region",
        ],
        "participantCount": total,
        "datasets": records,
        "acceptanceStandard": "docs/EXG-LM-LAUNCH-BASELINE-001.md",
        "audit": "data/geography/staged/four-region-launch-baseline-audit-003.json",
        "acceptedUnknowns": {
            "zeroParticipantLocalities": True,
            "sourceLocatedButNoSafeLINZLocality": True,
            "unknownLongTailLandscapeAreas": True,
            "invalidLocalityGeometryWhenBrowserRenderingReliable": True,
        },
        "nonNegotiableFailures": {
            "silentParticipantLoss": False,
            "inventedGeography": False,
            "brokenRegionOrLocalityNavigation": False,
            "brokenParticipantProfiles": False,
            "materiallyMisleadingGeography": False,
        },
        "browserValidation": {
            "northlandProfilesConfirmed": True,
            "areaModel002DevelopmentProofConfirmed": True,
        },
        "notes": [
            "This freeze defines a practical launch baseline, not geographic completeness.",
            "Post-launch enrichment may add participants, aliases, landscape Areas and authoritative geometry.",
            "No public/data registration is performed by this script.",
        ],
    }

    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("EX GAMES LIVING MAP — FOUR-REGION LAUNCH BASELINE FREEZE")
    print("=" * 76)
    print(f"Participants frozen: {total}")
    print()

    for item in records:
        print(
            f"{item['region']:24} "
            f"{item['participantCount']:4d}  "
            f"{item['frozenFile']}"
        )

    print()
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print("Baseline status: FROZEN_FOR_LAUNCH_BASELINE")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
