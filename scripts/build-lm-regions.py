import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENHANCED = ROOT / "data" / "participants" / "enhanced"
STAGED = ROOT / "data" / "participants" / "staged"
STAGED.mkdir(parents=True, exist_ok=True)

def slug(text):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")

def source_urls(values):
    out = []
    for value in values or []:
        if isinstance(value, str):
            out.append(value)
        elif isinstance(value, dict):
            for key in ("url", "source_url", "href"):
                if value.get(key):
                    out.append(value[key])
                    break
    return out

def long_tail_row(row, prefix):
    locality = row.get("locality_or_operating_area")
    return {
        "id": row.get("candidate_id") or prefix + slug(row["canonical_name"]),
        "name": row["canonical_name"],
        "entityType": row.get("candidate_type"),
        "status": "located",
        "localities": [locality] if locality else [],
        "relationship": row.get("organisation_or_affiliation"),
        "summary": row.get("activity_summary"),
        "activities": row.get("activity_categories") or [],
        "sources": source_urls(row.get("sources")),
        "enrichmentStatus": row.get("verification_status"),
        "populationSources": ["long-tail-enhanced-001"],
    }

def waikato_baseline_row(row):
    locality = row.get("canonical_locality")
    return {
        "id": "wkt-" + slug(row["participant_name"]),
        "name": row["participant_name"],
        "entityType": row.get("participant_class"),
        "status": "located",
        "localities": [locality] if locality else [],
        "relationship": row.get("organisation_relationship"),
        "summary": row.get("evidence_summary"),
        "activities": [row["ecological_activity"]] if row.get("ecological_activity") else [],
        "sources": row.get("source_urls") or [],
        "enrichmentStatus": "public-source-evidenced",
        "populationSources": ["waikato-exa-xhigh-001"],
    }

def northland_row(row):
    locality = row.get("base_location")
    if isinstance(locality, list):
        localities = locality
    elif locality:
        localities = [locality]
    else:
        localities = []
    return {
        "id": row["entity_id"],
        "name": row["canonical_name"],
        "entityType": row.get("entity_class"),
        "status": "located",
        "localities": localities,
        "relationship": row.get("organisation_or_affiliation"),
        "summary": row.get("activity_summary"),
        "activities": [x.strip() for x in (row.get("activities") or "").split(";") if x.strip()],
        "sources": source_urls(row.get("primary_sources")) + source_urls(row.get("additional_sources")),
        "enrichmentStatus": row.get("verification_status"),
        "populationSources": ["northland-resolved-002"],
    }

def dedupe_check(region, rows):
    ids = {}
    names = {}
    problems = []
    for row in rows:
        rid = row.get("id")
        name = (row.get("name") or "").casefold().strip()
        if rid in ids:
            problems.append(f"duplicate id {rid}: {ids[rid]} / {row.get('name')}")
        else:
            ids[rid] = row.get("name")
        if name in names:
            problems.append(f"duplicate name {row.get('name')}: {names[name]} / {rid}")
        else:
            names[name] = rid
    if problems:
        print(f"\n{region}: duplicate check failed")
        for problem in problems[:25]:
            print(" ", problem)
        raise SystemExit(1)

def write_region(region, rows, filename):
    dedupe_check(region, rows)
    target = STAGED / filename
    payload = {"region": region, "participants": rows}
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{region}: {len(rows)} participants -> {target.relative_to(ROOT)}")
    return target

def load(name):
    return json.loads((ENHANCED / name).read_text(encoding="utf-8"))

auckland_pkg = load("EXG-AUCKLAND-LONG-TAIL-ENHANCED-001.json")
bop_pkg = load("EXG-BAY-OF-PLENTY-LONG-TAIL-ENHANCED-001.json")
waikato_pkg = load("EXG-WAIKATO-LONG-TAIL-ENHANCED-001.json")
northland_pkg = load("EXG-NORTHLAND-RESOLVED-002.json")

auckland = json.loads((ROOT / "data" / "participants-auckland-located-001.json").read_text(encoding="utf-8"))["participants"]
bop = json.loads((ROOT / "data" / "participants-bay-of-plenty-located-002.json").read_text(encoding="utf-8"))["participants"]

auckland_add = [
    long_tail_row(r, "akl-")
    for r in auckland_pkg["long_tail_additions"]
    if r.get("participant_candidate") is True and r.get("living_map_eligible") == "PROVISIONAL"
]
bop_add = [
    long_tail_row(r, "bop-")
    for r in bop_pkg["long_tail_additions"]
    if r.get("participant_candidate") is True and r.get("living_map_eligible") == "PROVISIONAL"
]

waikato = [waikato_baseline_row(r) for r in waikato_pkg["baseline"]["records"]]
waikato += [
    long_tail_row(r, "wkt-")
    for r in waikato_pkg["long_tail_additions"]
    if r.get("participant_candidate") is True and r.get("living_map_eligible") == "PROVISIONAL"
]

northland = [
    northland_row(r)
    for r in northland_pkg["entities"]
    if r.get("participant_candidate") == "YES" and r.get("living_map_eligible") == "PROVISIONAL"
]

targets = [
    write_region("Auckland", auckland + auckland_add, "participants-auckland-located-002.json"),
    write_region("Bay of Plenty Region", bop + bop_add, "participants-bay-of-plenty-located-003.json"),
    write_region("Waikato", waikato, "participants-waikato-located-001.json"),
    write_region("Northland", northland, "participants-northland-located-002.json"),
]

validator = ROOT / "scripts" / "validate-participants.py"
print("\nRunning existing validator...")
result = subprocess.run([sys.executable, str(validator), *map(str, targets)])
if result.returncode:
    raise SystemExit(result.returncode)

print("\nAll staged regional datasets validated successfully.")
print("Nothing has been registered or copied into public/data.")
