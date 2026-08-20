import csv,json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"data/participants/staged/exa-latest-five/EXA-NORTH-ISLAND-LATEST-FIVE-LM-STAGED-001.csv"
OUT=ROOT/"data/participants/staged"

REGIONS={
"Taranaki":("Taranaki Region","participants-taranaki-located-001.json"),
"Gisborne / Tairāwhiti":("Gisborne Region","participants-gisborne-located-001.json"),
"Hawke's Bay":("Hawke's Bay Region","participants-hawkes-bay-located-001.json"),
"Manawatū–Whanganui":("Manawatū-Whanganui Region","participants-manawatu-whanganui-located-001.json"),
"Wellington–Wairarapa":("Wellington Region","participants-wellington-wairarapa-located-001.json"),
}

def vals(v):
    return [x.strip() for x in str(v or "").split("|") if x.strip()]

rows=list(csv.DictReader(SRC.open(encoding="utf-8-sig")))

for source,(region,fn) in REGIONS.items():
    items=[]
    for r in rows:
        if r["region"] != source:
            continue
        items.append({
            "id":r["lm_candidate_id"],
            "name":r["name"],
            "entityType":r["entity_type"],
            "status":"located",
            "localities":vals(r["locality"]),
        })
        items[-1].update({
            "relationship":r["affiliation"],
            "summary":r["activity_summary"],
            "activities":vals(r["activity_tags"]),
            "sources":vals(r["source_urls"]),
            "enrichmentStatus":r["evidence_grade"],
            "populationSources":["exa-latest-five-001"],
        })

    payload={"region":region,"participants":items}
    p=OUT/fn
    p.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
    print(f"{region}: {len(items)} -> {p.relative_to(ROOT)}")
