import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import { firstLivingMapArea } from './areas'
import { aucklandLocalitiesUrl } from './localities'

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
    this.button.style.width = 'auto'
    this.button.style.padding = '0 12px'
    this.button.style.fontWeight = '600'
    this.button.style.whiteSpace = 'nowrap'

    this.button.addEventListener('click', () => {
      this.localitiesRevealed = !this.localitiesRevealed
      const fillOpacity = this.localitiesRevealed ? 0.08 : 0
      const lineOpacity = this.localitiesRevealed ? 0.72 : 0

      controlMap.setPaintProperty(
        'auckland-localities-fill',
        'fill-opacity',
        fillOpacity,
      )
      controlMap.setPaintProperty(
        'auckland-localities-outline',
        'line-opacity',
        lineOpacity,
      )

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
  })

  map.addLayer({
    id: 'auckland-localities-fill',
    type: 'fill',
    source: 'auckland-localities',
    paint: {
      'fill-color': '#315f64',
      'fill-opacity': 0,
    },
  })

  map.addLayer({
    id: 'auckland-localities-outline',
    type: 'line',
    source: 'auckland-localities',
    paint: {
      'line-color': '#315f64',
      'line-opacity': 0,
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

  map.addControl(new AucklandRegionControl(), 'top-left')

  map.addSource('living-map-areas', {
    type: 'geojson',
    data: firstLivingMapArea,
  })

  map.addLayer({
    id: 'living-map-area-fill',
    type: 'fill',
    source: 'living-map-areas',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#e4b44c',
        '#315f64',
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
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f6d787',
        '#23494d',
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3,
        2,
      ],
    },
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

    new maplibregl.Popup()
      .setLngLat(event.lngLat)
      .setHTML(`
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
