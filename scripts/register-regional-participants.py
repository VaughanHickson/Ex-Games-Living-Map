import json,shutil,subprocess,sys
from pathlib import Path

if len(sys.argv)!=3:
 print("Usage: register-regional-participants.py FILE REGION"); sys.exit(2)

root=Path(__file__).parents[1]
src=Path(sys.argv[1]).expanduser().resolve()
region=sys.argv[2]
validator=root/"scripts/validate-participants.py"

subprocess.run([sys.executable,str(validator),str(src)],check=True)

dst=root/"public/data"/src.name
if src != dst.resolve():
 shutil.copy2(src,dst)

manifest=root/"public/data/participant-regional-datasets.json"
data=json.load(open(manifest))
entry={"region":region,"path":f"/data/{dst.name}"}
data["datasets"]=[x for x in data["datasets"] if x["region"]!=region]
data["datasets"].append(entry)
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")

print(f"Registered {region}: {dst.name}")
