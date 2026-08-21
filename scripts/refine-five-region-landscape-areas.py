#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = ROOT / "data" / "geography" / "staged" / "five-region-landscape-areas-001.json"
AUDIT = ROOT / "data" / "geography" / "staged" / "five-region-landscape-area-classification-audit-001.json"
OUT = ROOT / "data" / "geography" / "staged" / "five-region-landscape-areas-002.json"

# Non-OTHER landscape classes from the original build are retained.
# OTHER_LANDSCAPE survives only when the classification audit says it is a
# likely landscape and supplies a suggested concrete type.
KEEP_BASE_TYPES = {
    "CATCHMENT",
    "FOREST",
    "HARBOUR_BAY",
    "ISLAND",
    "PENINSULA",
    "RANGE_MOUNTAIN",
    "RESERVE_SANCTUARY",
    "RIVER_STREAM",
    "VALLEY",
    "WETLAND_LAKE",
    "WIDER_ECOLOGICAL_AREA",
}

def main():
    if not AREAS.exists():
        raise SystemExit(f"Missing area package: {AREAS}")
    if not AUDIT.exists():
        raise SystemExit(f"Missing classification audit: {AUDIT}")

    areas = json.loads(AREAS.read_text(encoding="utf-8"))
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))

    audit_by_id = {r["id"]: r for r in audit.get("records", [])}

    kept = []
    excluded = []

    for row in areas.get("areas", []):
        current = row.get("areaType")

        if current in KEEP_BASE_TYPES:
            out = dict(row)
            out["refinementStatus"] = "RETAINED_TYPED_LANDSCAPE"
            kept.append(out)
            continue

        if current == "OTHER_LANDSCAPE":
            ar = audit_by_id.get(row.get("id"))
            if ar and ar.get("auditClass") == "LIKELY_LANDSCAPE" and ar.get("suggestedAreaType"):
                out = dict(row)
                out["areaType"] = ar["suggestedAreaType"]
                out["refinementStatus"] = "PROMOTED_FROM_OTHER"
                out["refinementAuditClass"] = ar["auditClass"]
                kept.append(out)
            else:
                excluded.append({
                    "id": row.get("id"),
                    "name": row.get("name"),
                    "region": row.get("region"),
                    "participantIds": row.get("participantIds", []),
                    "participantNames": row.get("participantNames", []),
                    "originalAreaType": current,
                    "auditClass": ar.get("auditClass") if ar else "UNCLASSIFIED",
                    "reason": "Not automatically promoted to Landscape Area.",
                })
            continue

        excluded.append({
            "id": row.get("id"),
            "name": row.get("name"),
            "region": row.get("region"),
            "participantIds": row.get("participantIds", []),
            "participantNames": row.get("participantNames", []),
            "originalAreaType": current,
            "auditClass": "UNEXPECTED_TYPE",
            "reason": "Unexpected type excluded pending review.",
        })

    kept.sort(key=lambda r: (r["region"], r["areaType"], r["name"].casefold()))
    excluded.sort(key=lambda r: (r["region"], r["name"].casefold()))

    by_region = Counter(r["region"] for r in kept)
    by_type = Counter(r["areaType"] for r in kept)
    exclusion_classes = Counter(r["auditClass"] for r in excluded)

    # Rebuild participant links so only retained landscape Areas remain.
    participant_links = defaultdict(list)
    for row in kept:
        for pid in row.get("participantIds", []):
            participant_links[pid].append(row["id"])

    output = {
        "schema": "EXG-LM-LANDSCAPE-AREAS-002",
        "areaModel": areas.get("areaModel", "EXG-LM-AREA-MODEL-002"),
        "status": "STAGED_REFINED",
        "source": str(AREAS.relative_to(ROOT)),
        "classificationAudit": str(AUDIT.relative_to(ROOT)),
        "policy": {
            "ordinary_named_places_not_auto_promoted": True,
            "compound_multi_place_terms_not_auto_promoted": True,
            "admin_wider_area_terms_not_auto_promoted": True,
            "boundaries_not_invented": True,
        },
        "areaCount": len(kept),
        "excludedCandidateCount": len(excluded),
        "countsByRegion": dict(sorted(by_region.items())),
        "countsByType": dict(sorted(by_type.items())),
        "excludedCountsByAuditClass": dict(sorted(exclusion_classes.items())),
        "areas": kept,
        "excludedCandidates": excluded,
        "participantAreaLinks": dict(sorted(participant_links.items())),
    }

    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — REFINED FIVE-REGION LANDSCAPE AREAS")
    print("=" * 76)
    print(f"Retained landscape Areas:        {len(kept):4d}")
    print(f"Excluded ambiguous/place terms:  {len(excluded):4d}")
    print()

    print("Retained by region:")
    for region, count in sorted(by_region.items()):
        print(f"  {region:28} {count:4d}")

    print()
    print("Retained by type:")
    for typ, count in sorted(by_type.items()):
        print(f"  {typ:28} {count:4d}")

    print()
    print("Excluded by audit class:")
    for cls, count in sorted(exclusion_classes.items()):
        print(f"  {cls:28} {count:4d}")

    print()
    print(f"Output: {OUT.relative_to(ROOT)}")
    print("No source files were modified.")
    print("No boundaries were invented.")
    print("Nothing was copied to public/data or registered in the LM.")

if __name__ == "__main__":
    main()
