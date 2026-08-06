import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import { firstLivingMapArea } from './areas'
import { aucklandLocalitiesUrl } from './localities'
import { exGamesBrand, exGamesPalette } from './brand'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Living Map application root was not found.')
}

app.innerHTML = '<div id="map" aria-label="Interactive map of Auckland"></div>'

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [174.7633, -36.8485],
  zoom: 9.5,
  bearing: 0,
  pitch: 0,
})

map.addControl(
  new maplibregl.NavigationControl({
    showCompass: true,
    showZoom: true,
    visualizePitch: true,
  }),
  'top-right',
)

let selectedLocalityId: string | number | undefined

const hideDemonstrationSite = () => {
  map.setLayoutProperty('living-map-area-fill', 'visibility', 'none')
  map.setLayoutProperty('living-map-area-outline', 'visibility', 'none')
}

class AucklandRegionControl implements maplibregl.IControl {
  private container?: HTMLDivElement
  private button?: HTMLButtonElement
  private localitiesRevealed = false

  onAdd(controlMap: maplibregl.Map): HTMLElement {
    this.container = document.createElement('div')
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.textContent = 'Auckland Region'
    this.button.title = 'Reveal Auckland localities'
    this.button.setAttribute('aria-label', 'Reveal Auckland localities')
    this.button.setAttribute('aria-pressed', 'false')
    this.button.className = 'ex-games-region-control'

    this.button.addEventListener('click', () => {
      this.localitiesRevealed = !this.localitiesRevealed
      const visibility = this.localitiesRevealed ? 'visible' : 'none'

      controlMap.setLayoutProperty(
        'auckland-localities-fill',
        'visibility',
        visibility,
      )
      controlMap.setLayoutProperty(
        'auckland-localities-outline',
        'visibility',
        visibility,
      )
      controlMap.setLayoutProperty(
        'auckland-localities-selected-fill',
        'visibility',
        visibility,
      )
      controlMap.setLayoutProperty(
        'auckland-localities-selected-outline',
        'visibility',
        visibility,
      )

      if (!this.localitiesRevealed) {
        if (selectedLocalityId !== undefined) {
          controlMap.setFeatureState(
            {
              source: 'auckland-localities',
              id: selectedLocalityId,
            },
            { selected: false },
          )
          selectedLocalityId = undefined
        }

        hideDemonstrationSite()
      }

      this.button?.setAttribute(
        'aria-pressed',
        String(this.localitiesRevealed),
      )
      this.button!.textContent = this.localitiesRevealed
        ? 'Auckland Region ✓'
        : 'Auckland Region'
      this.button!.title = this.localitiesRevealed
        ? 'Hide Auckland localities'
        : 'Reveal Auckland localities'
    })

    this.container.appendChild(this.button)
    return this.container
  }

  onRemove(): void {
    this.container?.remove()
    this.container = undefined
    this.button = undefined
  }
}

map.on('load', () => {
  map.addSource('auckland-localities', {
    type: 'geojson',
    data: aucklandLocalitiesUrl,
    attribution: 'NZ Suburbs and Localities © LINZ',
    generateId: true,
  })

  map.addLayer({
    id: 'auckland-localities-fill',
    type: 'fill',
    source: 'auckland-localities',
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-color': exGamesPalette.forestGreen,
      'fill-opacity': 0.08,
    },
  })

  map.addLayer({
    id: 'auckland-localities-outline',
    type: 'line',
    source: 'auckland-localities',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': exGamesPalette.manukaGrey,
      'line-opacity': 0.72,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        0.5,
        12,
        1.5,
      ],
    },
  })

  map.addLayer({
    id: 'auckland-localities-selected-fill',
    type: 'fill',
    source: 'auckland-localities',
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-color': exGamesPalette.leafLime,
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.32,
        0,
      ],
    },
  })

  map.addLayer({
    id: 'auckland-localities-selected-outline',
    type: 'line',
    source: 'auckland-localities',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': exGamesPalette.warmGold,
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        1,
        0,
      ],
      'line-width': 3,
    },
  })

  map.addControl(new AucklandRegionControl(), 'top-left')

  map.addSource('living-map-areas', {
    type: 'geojson',
    data: firstLivingMapArea,
  })

  map.addLayer({
    id: 'living-map-area-fill',
    type: 'fill',
    source: 'living-map-areas',
    layout: {
      visibility: 'none',
    },
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        exGamesPalette.leafLime,
        exGamesPalette.forestGreen,
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.55,
        0.28,
      ],
    },
  })

  map.addLayer({
    id: 'living-map-area-outline',
    type: 'line',
    source: 'living-map-areas',
    layout: {
      visibility: 'none',
    },
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        exGamesPalette.mist,
        exGamesPalette.kauriDark,
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3,
        2,
      ],
    },
  })

  map.on('click', 'auckland-localities-fill', (event) => {
    const feature = event.features?.[0]

    if (!feature || feature.id === undefined) {
      return
    }

    if (selectedLocalityId !== undefined) {
      map.setFeatureState(
        {
          source: 'auckland-localities',
          id: selectedLocalityId,
        },
        { selected: false },
      )
    }

    selectedLocalityId = feature.id
    map.setFeatureState(
      {
        source: 'auckland-localities',
        id: selectedLocalityId,
      },
      { selected: true },
    )

    const localityName =
      feature.properties?.name ?? feature.properties?.major_name ?? 'Locality'
    const isAucklandCentral = localityName === 'Auckland Central'

    map.setLayoutProperty(
      'living-map-area-fill',
      'visibility',
      isAucklandCentral ? 'visible' : 'none',
    )
    map.setLayoutProperty(
      'living-map-area-outline',
      'visibility',
      isAucklandCentral ? 'visible' : 'none',
    )

    new maplibregl.Popup({ className: 'ex-games-popup' })
      .setLngLat(event.lngLat)
      .setHTML(
        isAucklandCentral
          ? `
            <strong>${localityName}</strong>
            <p>1 contained Site revealed</p>
            <small>Select the Demonstration Site to inspect it.</small>
          `
          : `
            <strong>${localityName}</strong>
            <p>No demonstration Sites registered yet.</p>
          `,
      )
      .addTo(map)
  })

  map.on('mouseenter', 'auckland-localities-fill', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'auckland-localities-fill', () => {
    map.getCanvas().style.cursor = ''
  })

  let selectedAreaId: string | number | undefined

  map.on('click', 'living-map-area-fill', (event) => {
    const feature = event.features?.[0]

    if (!feature || feature.id === undefined) {
      return
    }

    if (selectedAreaId !== undefined) {
      map.setFeatureState(
        { source: 'living-map-areas', id: selectedAreaId },
        { selected: false },
      )
    }

    selectedAreaId = feature.id

    map.setFeatureState(
      { source: 'living-map-areas', id: selectedAreaId },
      { selected: true },
    )

    const properties = feature.properties

    new maplibregl.Popup({ className: 'ex-games-popup' })
      .setLngLat(event.lngLat)
      .setHTML(`
        <div class="ex-games-popup__brand">
          <span>${exGamesBrand.name}</span>
          <small>${exGamesBrand.mission}</small>
        </div>
        <strong>${properties.name}</strong>
        <p>${properties.regionName} → ${properties.localityName}</p>
        <p><small>${properties.hierarchyLabel}</small></p>
        <small>${properties.boundaryStatus}</small>
      `)
      .addTo(map)
  })

  map.on('mouseenter', 'living-map-area-fill', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'living-map-area-fill', () => {
    map.getCanvas().style.cursor = ''
  })
})
