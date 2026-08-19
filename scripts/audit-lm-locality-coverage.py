#!/usr/bin/env python3
import json
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

try:
    from shapely.geometry import shape, Polygon, MultiPolygon, GeometryCollection
    from shapely.ops import unary_union
    from shapely.validation import make_valid
    from pyproj import Geod
except ImportError:
    print('Missing audit dependencies. Run: python -m pip install shapely pyproj', file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
LOCALITIES = ROOT / 'public' / 'data' / 'nz-suburbs-localities.geojson'
REGIONS = ROOT / 'public' / 'data' / 'nz-regions.geojson'
STAGED = ROOT / 'data' / 'participants' / 'staged'

TARGETS = {
    'Northland Region': STAGED / 'participants-northland-located-002.json',
    'Auckland': STAGED / 'participants-auckland-located-002.json',
    'Waikato Region': STAGED / 'participants-waikato-located-001.json',
    'Bay of Plenty Region': STAGED / 'participants-bay-of-plenty-located-003.json',
}

REGION_ALIASES = {
    'Northland': 'Northland Region',
    'Northland Region': 'Northland Region',
    'Auckland': 'Auckland',
    'Auckland Region': 'Auckland',
    'Waikato': 'Waikato Region',
    'Waikato Region': 'Waikato Region',
    'Bay of Plenty': 'Bay of Plenty Region',
    'Bay of Plenty Region': 'Bay of Plenty Region',
}

GEOD = Geod(ellps='WGS84')


def polygonal_valid(geom):
    """Return a valid polygonal geometry without modifying the source GeoJSON."""
    if geom is None or geom.is_empty:
        return geom

    if not geom.is_valid:
        geom = make_valid(geom)

    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom

    if isinstance(geom, GeometryCollection):
        polygon_parts = []
        for part in geom.geoms:
            if isinstance(part, (Polygon, MultiPolygon)) and not part.is_empty:
                polygon_parts.append(part)
        if not polygon_parts:
            return GeometryCollection()
        geom = unary_union(polygon_parts)
        if not geom.is_valid:
            geom = make_valid(geom)
        return geom

    return GeometryCollection()

def norm(value):
    value = unicodedata.normalize('NFKC', str(value or '')).strip().casefold()
    return ' '.join(value.split())

def pname(props):
    return props.get('name') or props.get('major_name') or props.get('NAME') or props.get('Name')

def pregion(props):
    raw = props.get('region') or props.get('regionName') or props.get('REGION') or props.get('name')
    return REGION_ALIASES.get(str(raw), str(raw))

def area_km2(geom):
    if geom.is_empty:
        return 0.0
    area_m2, _ = GEOD.geometry_area_perimeter(geom)
    return abs(area_m2) / 1_000_000.0

def load_json(path):
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding='utf-8'))

def region_feature_lookup(fc):
    out = {}
    for f in fc.get('features', []):
        props = f.get('properties') or {}
        raw = props.get('region') or props.get('name') or props.get('regionName') or props.get('REGC2025_V1_00_NAME') or props.get('REGC2023_V1_00_NAME') or props.get('REGC2023_V1_00_NAME_ASCII')
        key = REGION_ALIASES.get(str(raw), str(raw))
        if key in TARGETS:
            out[key] = f
    return out

def main():
    local_fc = load_json(LOCALITIES)
    region_fc = load_json(REGIONS)
    region_features = region_feature_lookup(region_fc)

    by_region = defaultdict(list)
    for f in local_fc.get('features', []):
        props = f.get('properties') or {}
        region = pregion(props)
        if region in TARGETS:
            by_region[region].append(f)

    print('EX GAMES LIVING MAP — FOUR-REGION LOCALITY COVERAGE AUDIT')
    print('=' * 72)
    print(f'Locality source: {LOCALITIES.relative_to(ROOT)}')
    print(f'Region source:   {REGIONS.relative_to(ROOT)}')

    overall_unresolved = []

    for region, participant_path in TARGETS.items():
        print('\n' + region.upper())
        print('-' * 72)
        participants = load_json(participant_path).get('participants', [])
        loc_features = by_region.get(region, [])

        names = []
        name_to_features = defaultdict(list)
        for f in loc_features:
            n = pname(f.get('properties') or {})
            if n:
                names.append(n)
                name_to_features[norm(n)].append(f)
        locality_names = set(name_to_features)

        participant_localities = Counter()
        region_only = []
        no_location = []
        unresolved = defaultdict(list)

        for p in participants:
            locs = p.get('mapLocalities') or p.get('localities') or ([p.get('locality')] if p.get('locality') else [])
            locs = [x for x in locs if x]
            if not locs:
                no_location.append(p.get('name') or p.get('id'))
                continue
            for loc in locs:
                n = norm(loc)
                if n in {norm(region), norm(region.replace(' Region',''))}:
                    region_only.append(p.get('name') or p.get('id'))
                elif n in locality_names:
                    participant_localities[n] += 1
                else:
                    unresolved[str(loc)].append(p.get('name') or p.get('id'))

        populated = set(participant_localities)
        unpopulated = locality_names - populated

        print(f'Participants:                         {len(participants):5d}')
        print(f'LINZ locality/suburb polygons:        {len(loc_features):5d}')
        print(f'Unique mapped locality names:         {len(locality_names):5d}')
        print(f'Localities with >=1 participant:      {len(populated):5d}')
        print(f'Localities with 0 participants:       {len(unpopulated):5d}')
        coverage_pct = (100 * len(populated) / len(locality_names)) if locality_names else 0
        print(f'Participant locality coverage:        {coverage_pct:5.1f}%')
        print(f'Unresolved participant locality names:{len(unresolved):5d}')
        print(f'Region-only participants:             {len(region_only):5d}')
        print(f'Participants with no locality:        {len(no_location):5d}')

        if unresolved:
            print('\nUnresolved locality names (top 25):')
            for loc, ps in sorted(unresolved.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:25]:
                print(f'  {loc:<36} {len(ps):>3}  {", ".join(ps[:3])}')
                overall_unresolved.append((region, loc, len(ps)))

        if unpopulated:
            print('\nUnpopulated mapped localities (first 40 alphabetically):')
            display = sorted({pname(name_to_features[n][0].get('properties') or {}) for n in unpopulated})
            for x in display[:40]:
                print(f'  {x}')
            if len(display) > 40:
                print(f'  ... +{len(display)-40} more')

        invalid_locality_geoms = sum(
            1 for f in loc_features
            if f.get('geometry') and not shape(f['geometry']).is_valid
        )
        print(f'Invalid locality geometries repaired for audit:{invalid_locality_geoms:5d}')

        rf = region_features.get(region)
        if not rf:
            print('\nSPATIAL GAP: region boundary feature not found; area gap not calculated.')
            continue

        try:
            region_geom = polygonal_valid(shape(rf['geometry']))
            locality_geoms = [
                polygonal_valid(shape(f['geometry']))
                for f in loc_features
                if f.get('geometry')
            ]
            locality_geoms = [g for g in locality_geoms if g is not None and not g.is_empty]
            locality_union = unary_union(locality_geoms) if locality_geoms else None
            if locality_union is not None and not locality_union.is_valid:
                locality_union = polygonal_valid(locality_union)
            if locality_union is None:
                print('\nSPATIAL GAP: no locality geometry available.')
                continue
            covered = region_geom.intersection(locality_union)
            gap = region_geom.difference(locality_union)
            reg_area = area_km2(region_geom)
            covered_area = area_km2(covered)
            gap_area = area_km2(gap)
            print('\nSpatial locality-layer coverage:')
            print(f'  Region land geometry area:          {reg_area:10.1f} km²')
            print(f'  Covered by locality polygons:       {covered_area:10.1f} km²  ({100*covered_area/reg_area if reg_area else 0:5.1f}%)')
            print(f'  Outside locality polygons:          {gap_area:10.1f} km²  ({100*gap_area/reg_area if reg_area else 0:5.1f}%)')
            parts = list(gap.geoms) if hasattr(gap, 'geoms') else [gap]
            parts = sorted(parts, key=area_km2, reverse=True)
            print('  Largest uncovered components:')
            for g in parts[:10]:
                a = area_km2(g)
                if a < 0.05:
                    continue
                c = g.representative_point()
                print(f'    {a:9.1f} km² near {c.y:.5f}, {c.x:.5f}')
        except Exception as exc:
            print(f'\nSPATIAL GAP calculation failed: {exc}')

    print('\n' + '=' * 72)
    print('INTERPRETATION')
    print('1. Unpopulated mapped localities are discovery/population gaps, not geography gaps.')
    print('2. Unresolved participant locality names are resolution/alias problems.')
    print('3. Region-only/no-locality records need deliberate placement policy.')
    print('4. Land outside locality polygons is a geography-layer gap and should not be')
    print('   fixed by inventing suburbs/localities; it may require a complementary Area layer.')

if __name__ == '__main__':
    main()
