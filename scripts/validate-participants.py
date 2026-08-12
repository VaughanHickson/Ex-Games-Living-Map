import json,sys
failed=False
for fn in sys.argv[1:]:
 d=json.load(open(fn)); rows=d.get("participants",[]); errors=[]; unresolved=[]; seen=set()
 region=d.get("region","")
 for i,r in enumerate(rows):
  rid=str(r.get("id","")).strip()
  if not rid: errors.append(f"row {i}: missing id")
  elif rid in seen: errors.append(f"duplicate id: {rid}")
  seen.add(rid)
  if not str(r.get("name","")).strip(): errors.append(f"{rid}: missing name")
  if r.get("status")!="located": errors.append(f"{rid}: status != located")
  maploc=r.get("mapLocalities") or []
  research=r.get("localities") or ([r["locality"]] if r.get("locality") else [])
  if not research and not maploc:
   unresolved.append(f"{rid}: region-only ({region})")
 print(f"{fn}: {len(rows)} participants, {len(errors)} errors, {len(unresolved)} region-only")
 for e in errors[:10]: print(" ERROR",e)
 for e in unresolved[:10]: print(" NOTE ",e)
 failed |= bool(errors)
sys.exit(1 if failed else 0)
