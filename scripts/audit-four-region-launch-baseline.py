#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
LOCALITIES = ROOT / "public" / "data" / "nz-suburbs-localities.geojson"
RESOLVED = ROOT / "data" / "participants" / "resolved"
OUT = ROOT / "data" / "geography" / "staged" / "four-region-launch-baseline-audit-003.json"

TARGETS = {
    "Northland Region": RESOLVED / "participants-northland-located-002-resolved-001.json",
    "Auckland": RESOLVED / "participants-auckland-located-002-resolved-001.json",
    "Waikato Region": RESOLVED / "participants-waikato-located-001-resolved-001.json",
    "Bay of Plenty Region": RESOLVED / "participants-bay-of-plenty-located-003-resolved-001.json",
}

def norm(value):
    return " ".join(str(value or "").strip().casefold().split())

def locality_name(props):
    return props.get("name") or props.get("major_name") or props.get("NAME")

def as_list(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if value:
        return [str(value).strip()]
    return []

def main():
    if not LOCALITIES.exists():
        raise SystemExit(f"Missing locality geography: {LOCALITIES}")

    geo = json.loads(LOCALITIES.read_text(encoding="utf-8"))

    locality_names = {region: {} for region in TARGETS}
    invalid = Counter()

    for feature in geo.get("features", []):
        props = feature.get("properties") or {}
        region = props.get("region")
        if region not in TARGETS:
            continue

        name = locality_name(props)
        if not name:
            continue

        valid = False
        try:
            valid = shape(feature.get("geometry")).is_valid
        except Exception:
            pass

        locality_names[region][norm(name)] = name
        if not valid:
            invalid[region] += 1

    totals = Counter()
    region_reports = {}
    action_records = []

    for region, path in TARGETS.items():
        if not path.exists():
            raise SystemExit(f"Missing resolved dataset: {path}")

        payload = json.loads(path.read_text(encoding="utf-8"))
        participants = payload.get("participants", [])
        loc_counts = Counter()

        mapped = 0
        source_located_only = 0
        no_geography = 0
        bad_map_localities = 0
        partial_bad_map_localities = 0

        for p in participants:
            maps = as_list(p.get("mapLocalities"))
            sources = as_list(p.get("localities")) or as_list(p.get("locality"))

            matched = [m for m in maps if norm(m) in locality_names[region]]
            unmatched = [m for m in maps if norm(m) not in locality_names[region]]

            if matched:
                mapped += 1
                for m in matched:
                    loc_counts[norm(m)] += 1
                if unmatched:
                    partial_bad_map_localities += 1
                    action_records.append({
                        "region": region,
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "status": "PARTIAL_MAP_LOCALITY_MISMATCH",
                        "matchedMapLocalities": matched,
                        "unmatchedMapLocalities": unmatched,
                        "sourceLocalities": sources,
                    })
            elif maps:
                bad_map_localities += 1
                action_records.append({
                    "region": region,
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "status": "ALL_MAP_LOCALITIES_UNMATCHED",
                    "mapLocalities": maps,
                    "sourceLocalities": sources,
                })
            elif sources:
                source_located_only += 1
            else:
                no_geography += 1
                action_records.append({
                    "region": region,
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "status": "NO_GEOGRAPHY",
                })

        populated = sum(1 for k in locality_names[region] if loc_counts[k] > 0)
        zero = len(locality_names[region]) - populated

        region_reports[region] = {
            "sourceFile": str(path.relative_to(ROOT)),
            "participantCount": len(participants),
            "mappedParticipants": mapped,
            "sourceLocatedOnlyParticipants": source_located_only,
            "noGeographyParticipants": no_geography,
            "allMapLocalitiesUnmatched": bad_map_localities,
            "partialMapLocalityMismatch": partial_bad_map_localities,
            "localityCount": len(locality_names[region]),
            "populatedLocalities": populated,
            "zeroParticipantLocalities": zero,
            "populatedLocalityPercent": round(
                100 * populated / len(locality_names[region]), 1
            ) if locality_names[region] else 0,
            "invalidLocalityGeometries": invalid[region],
        }

        totals["participants"] += len(participants)
        totals["mapped"] += mapped
        totals["source_located_only"] += source_located_only
        totals["no_geography"] += no_geography
        totals["bad_map"] += bad_map_localities
        totals["partial_bad_map"] += partial_bad_map_localities

    blockers = []
    if totals["bad_map"]:
        blockers.append({
            "type": "ALL_MAP_LOCALITIES_UNMATCHED",
            "count": totals["bad_map"],
            "requiredAction": "FIX_OR_CLEAR_MAP_LOCALITIES",
        })
    if totals["no_geography"]:
        blockers.append({
            "type": "NO_GEOGRAPHY",
            "count": totals["no_geography"],
            "requiredAction": "REVIEW_AND_EXPLICITLY_CLASSIFY",
        })

    accepted_unknowns = {
        "sourceLocatedOnlyParticipants": totals["source_located_only"],
        "zeroParticipantLocalities": sum(
            r["zeroParticipantLocalities"] for r in region_reports.values()
        ),
        "unknownLongTailLandscapeAreas": "ACCEPTED_UNQUANTIFIED_BACKLOG",
        "invalidLocalityGeometryFeatures": sum(invalid.values()),
    }

    output = {
        "schema": "EXG-LM-FOUR-REGION-LAUNCH-BASELINE-AUDIT-003",
        "status": "FINAL_BASELINE_REVIEW",
        "policy": {
            "resolvedDatasetsAreSourceOfTruthForLaunchAudit": True,
            "zeroParticipantLocalitiesAccepted": True,
            "sourceLocatedButNoSafeLINZLocalityAccepted": True,
            "unknownLongTailLandscapeAccepted": True,
            "invalidGeometryAcceptedIfBrowserRenderingReliable": True,
            "noGeographyRequiresExplicitReview": True,
            "declaredMapLocalityMismatchRequiresFix": True,
        },
        "totals": dict(totals),
        "acceptedUnknowns": accepted_unknowns,
        "regions": region_reports,
        "actionRecords": action_records,
        "potentialLaunchBlockers": blockers,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("EX GAMES LIVING MAP — FOUR-REGION LAUNCH BASELINE AUDIT 003")
    print("=" * 78)

    for region in sorted(TARGETS):
        r = region_reports[region]
        print(f"\n{region}")
        print(f"  participants:                 {r['participantCount']:5d}")
        print(f"  mapped participants:          {r['mappedParticipants']:5d}")
        print(f"  source-located only:          {r['sourceLocatedOnlyParticipants']:5d}")
        print(f"  no geography:                 {r['noGeographyParticipants']:5d}")
        print(f"  bad declared map locality:    {r['allMapLocalitiesUnmatched']:5d}")
        print(f"  populated localities:         {r['populatedLocalities']:5d}/{r['localityCount']}")
        print(f"  locality coverage:            {r['populatedLocalityPercent']:5.1f}%")
        print(f"  invalid locality geometries:  {r['invalidLocalityGeometries']:5d}")

    print("\n" + "-" * 78)
    print(f"TOTAL participants:             {totals['participants']}")
    print(f"Mapped participants:            {totals['mapped']}")
    print(f"Source-located only:            {totals['source_located_only']}")
    print(f"No geography:                   {totals['no_geography']}")
    print(f"Bad declared map locality:      {totals['bad_map']}")
    print(f"Partial map mismatch:           {totals['partial_bad_map']}")
    print(f"Potential blocker classes:      {len(blockers)}")
    print(f"Output: {OUT.relative_to(ROOT)}")

    print("\nBaseline decision rule:")
    print("  FREEZE if bad declared map locality = 0,")
    print("  no-geography records are explicitly reviewed/classified,")
    print("  and browser/profile functionality remains reliable.")

if __name__ == "__main__":
    main()
