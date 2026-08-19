#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FROZEN = ROOT / "data" / "participants" / "baseline" / "launch-001"
PUBLIC = ROOT / "public" / "data"
REGISTRY = PUBLIC / "participant-regional-datasets.json"
BACKUP = PUBLIC / "participant-regional-datasets.pre-launch-baseline-001.json"

FILES = {
    "Northland Region": "participants-northland-located-002-resolved-001.json",
    "Auckland": "participants-auckland-located-002-baseline-001.json",
    "Waikato Region": "participants-waikato-located-001-resolved-001.json",
    "Bay of Plenty Region": "participants-bay-of-plenty-located-003-baseline-001.json",
}

PUBLIC_PATHS = [f"/data/{name}" for name in FILES.values()]

# Previous generations of the registry have been either a plain list or an
# object containing one of these list-valued keys. Abort on anything else.
SUPPORTED_KEYS = (
    "datasets",
    "paths",
    "files",
    "regionalParticipantDatasets",
)

def load_registry():
    if not REGISTRY.exists():
        raise SystemExit(f"Missing registry: {REGISTRY}")

    data = json.loads(REGISTRY.read_text(encoding="utf-8"))

    if isinstance(data, list):
        return data, None, data

    if isinstance(data, dict):
        for key in SUPPORTED_KEYS:
            value = data.get(key)
            if isinstance(value, list):
                return data, key, value

    raise SystemExit(
        "Unsupported participant-regional-datasets.json schema. "
        "No files were registered. Inspect the registry manually."
    )

def region_slug_from_path(path: str) -> str | None:
    p = path.casefold()
    if "northland" in p:
        return "northland"
    if "auckland" in p:
        return "auckland"
    if "waikato" in p:
        return "waikato"
    if "bay-of-plenty" in p:
        return "bay-of-plenty"
    return None

def main():
    missing = [name for name in FILES.values() if not (FROZEN / name).exists()]
    if missing:
        raise SystemExit(
            "Missing frozen files:\n  " + "\n  ".join(missing)
        )

    registry_obj, registry_key, registry_list = load_registry()

    if not BACKUP.exists():
        shutil.copy2(REGISTRY, BACKUP)

    # Replace only paths for these four regions. Preserve every other region.
    target_regions = {"northland", "auckland", "waikato", "bay-of-plenty"}

    preserved = []
    removed = []
    for item in registry_list:
        # Registry entries are expected to be strings. If an object appears,
        # fail rather than infer its schema.
        if not isinstance(item, str):
            raise SystemExit(
                "Registry contains non-string entries. "
                "No registry update performed; inspect schema manually."
            )
        if region_slug_from_path(item) in target_regions:
            removed.append(item)
        else:
            preserved.append(item)

    new_list = preserved + PUBLIC_PATHS

    if registry_key is None:
        new_registry = new_list
    else:
        new_registry = dict(registry_obj)
        new_registry[registry_key] = new_list

    # Copy frozen datasets first, under their immutable baseline filenames.
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for region, name in FILES.items():
        src = FROZEN / name
        dst = PUBLIC / name
        shutil.copy2(src, dst)

    REGISTRY.write_text(
        json.dumps(new_registry, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("EX GAMES LIVING MAP — REGISTER FOUR-REGION LAUNCH BASELINE")
    print("=" * 78)
    print("Copied frozen datasets:")
    for region, name in FILES.items():
        print(f"  {region:24} -> public/data/{name}")

    print()
    print("Replaced registry entries:")
    if removed:
        for item in removed:
            print(f"  - {item}")
    else:
        print("  (none found)")

    print()
    print("Registered baseline entries:")
    for item in PUBLIC_PATHS:
        print(f"  + {item}")

    print()
    print(f"Registry: {REGISTRY.relative_to(ROOT)}")
    print(f"Backup:   {BACKUP.relative_to(ROOT)}")
    print()
    print("Participant-regional registry updated.")
    print("No source or frozen baseline file was modified.")

if __name__ == "__main__":
    main()
