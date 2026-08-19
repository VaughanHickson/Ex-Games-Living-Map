#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src" / "main.ts"
BACKUP = ROOT / "src" / "main.ts.pre-area-model-002-dev-layer"

SOURCE_ID = "dev-northland-authoritative-areas"
FILL_ID = "dev-northland-authoritative-areas-fill"
OUTLINE_ID = "dev-northland-authoritative-areas-outline"

def fail(message: str):
    raise SystemExit(message)

def main():
    text = MAIN.read_text(encoding="utf-8")

    if SOURCE_ID in text:
        print("Northland authoritative dev layer already appears to be installed.")
        print("No changes made.")
        return

    if not BACKUP.exists():
        shutil.copy2(MAIN, BACKUP)

    # 1. Add dev Area layers to the existing region-controlled layer collection.
    # Use a deliberately narrow replacement so failure is explicit rather than
    # silently corrupting a changed main.ts.
    old_layers = """const layers=['auckland-localities-fill','auckland-localities-outline',
'auckland-localities-selected-fill','auckland-localities-selected-outline',
'auckland-localities-selected-label']"""

    new_layers = """const layers=['auckland-localities-fill','auckland-localities-outline',
'auckland-localities-selected-fill','auckland-localities-selected-outline',
'auckland-localities-selected-label',
'dev-northland-authoritative-areas-fill',
'dev-northland-authoritative-areas-outline']"""

    if old_layers not in text:
        fail(
            "Could not find the expected setActiveRegion layer list. "
            "main.ts was not modified. Please inspect the current function before retrying."
        )
    text = text.replace(old_layers, new_layers, 1)

    # 2. Install the dev-only GeoJSON source and visual layers immediately before
    # the existing locality fill layer.
    locality_layer_anchor = """  map.addLayer({
    id: 'auckland-localities-fill',"""

    dev_layers = """  // Area Model 002 development proof: authoritative Northland landscape Areas.
  // This source is intentionally separate from locality and participant registries.
  map.addSource('dev-northland-authoritative-areas', {
    type: 'geojson',
    data: '/data/dev-northland-authoritative-areas.geojson',
    attribution: 'Landscape boundaries © Department of Conservation',
    generateId: true,
  })

  map.addLayer({
    id: 'dev-northland-authoritative-areas-fill',
    type: 'fill',
    source: 'dev-northland-authoritative-areas',
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-color': exGamesPalette.forestGreen,
      'fill-opacity': 0.18,
    },
  })

  map.addLayer({
    id: 'dev-northland-authoritative-areas-outline',
    type: 'line',
    source: 'dev-northland-authoritative-areas',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': exGamesPalette.warmGold,
      'line-width': 2.5,
      'line-opacity': 0.95,
    },
  })

"""

    if locality_layer_anchor not in text:
        fail(
            "Could not find the locality fill-layer anchor. "
            "main.ts was not modified."
        )
    text = text.replace(
        locality_layer_anchor,
        dev_layers + locality_layer_anchor,
        1,
    )

    # 3. Add simple Area inspection interaction. Do not touch participant panel
    # state: the Area proof remains independent from locality participant logic.
    click_anchor = """  map.on('click', 'target-2050-candidate', (event) => {"""

    area_interaction = """  map.on('click', 'dev-northland-authoritative-areas-fill', (event) => {
    const feature = event.features?.[0]
    const properties = feature?.properties

    if (!properties) return

    const boundaryLabel =
      properties.boundaryStatus === 'AUTHORITATIVE'
        ? 'Authoritative boundary'
        : 'Derived from authoritative DOC components'

    const geometryLabel =
      properties.geometryStatus === 'ATTACHED'
        ? 'Geometry attached'
        : 'Development geometry staged'

    new maplibregl.Popup({ className: 'ex-games-popup' })
      .setLngLat(event.lngLat)
      .setHTML(`
        <div class="ex-games-popup__brand">
          <span>${exGamesBrand.name}</span>
          <small>Area Model 002 · development proof</small>
        </div>
        <strong>${properties.name ?? 'Landscape Area'}</strong>
        <p>${properties.areaType ?? 'LANDSCAPE AREA'} · ${properties.region ?? 'Northland Region'}</p>
        <small>${boundaryLabel} · ${geometryLabel}</small>
      `)
      .addTo(map)
  })

  map.on('mouseenter', 'dev-northland-authoritative-areas-fill', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'dev-northland-authoritative-areas-fill', () => {
    map.getCanvas().style.cursor = ''
  })

"""

    if click_anchor not in text:
        fail(
            "Could not find the target-2050 click-handler anchor. "
            "main.ts was not modified."
        )
    text = text.replace(click_anchor, area_interaction + click_anchor, 1)

    MAIN.write_text(text, encoding="utf-8")

    print("EX GAMES LIVING MAP — AREA MODEL 002 DEV-LAYER INSTALL")
    print("=" * 72)
    print(f"Updated: {MAIN.relative_to(ROOT)}")
    print(f"Backup:  {BACKUP.relative_to(ROOT)}")
    print()
    print("Installed:")
    print("  dev-northland-authoritative-areas source")
    print("  dev-northland-authoritative-areas-fill")
    print("  dev-northland-authoritative-areas-outline")
    print("  click popup + hover cursor")
    print()
    print("The layers remain hidden until Northland Region is selected.")
    print("Participant/locality logic was not modified.")

if __name__ == "__main__":
    main()
