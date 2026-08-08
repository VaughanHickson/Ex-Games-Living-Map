import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import { firstLivingMapArea } from './areas'
import { aucklandLocalitiesUrl } from './localities'
import { exGamesBrand, exGamesPalette } from './brand'
import { firstTarget2050Candidate } from './candidates'
import { riverheadParticipants } from './participants'
import { installLivingWater } from './water/worldWater'

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

const participantPanel = document.createElement('aside')
participantPanel.className = 'participant-panel'
participantPanel.hidden = true

app.appendChild(participantPanel)
let hoveredLocalityId: string | number | undefined

const showRiverheadParticipants = () => {
  participantPanel.hidden = false
  participantPanel.innerHTML = `
    <div class="participant-panel__head">
      <small>RIVERHEAD</small>
      <h2>Participants</h2>
      <p>${riverheadParticipants.length} currently on the map</p>
      <input class="participant-search"
        placeholder="Are you on the map?" />
    </div>
    <div class="participant-list">
      ${riverheadParticipants.map((p) => `
        <button class="participant-card" data-id="${p.id}">
          <strong>${p.name}</strong>
          <small>${p.type}</small>
          <span>${p.summary}</span>
          <em class="participant-claim-status">
            ${p.profileClaimed ? 'PROFILE CLAIMED' : 'UNCLAIMED'}
          </em>
        </button>`).join('')}
    </div>`
}

const showParticipant = (id: string) => {
  const p = riverheadParticipants.find((item) => item.id === id)
  if (!p) return

  participantPanel.innerHTML = `
    <button class="participant-back">← Riverhead participants</button>
    <small>${p.type.toUpperCase()}</small>
    <h2>${p.name}</h2>
    <p>${p.relationship}</p>
    <div class="participant-tags">
      ${p.activities.map((a) => `<span>${a}</span>`).join('')}
    </div>
    ${p.detail ? `<p>${p.detail}</p>` : ''}
  `
}

const hideDemonstrationSite = () => {
  map.setLayoutProperty('living-map-area-fill', 'visibility', 'none')
  map.setLayoutProperty('living-map-area-outline', 'visibility', 'none')
}

const hideTarget2050Candidate = () => {
  map.setLayoutProperty('target-2050-candidate', 'visibility', 'none')
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
      controlMap.setLayoutProperty(
        'auckland-localities-labels',
        'visibility',
        'none',
      )
      controlMap.setLayoutProperty(
        'auckland-localities-selected-label',
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

        if (hoveredLocalityId !== undefined) {
          controlMap.setFeatureState(
            {
              source: 'auckland-localities',
              id: hoveredLocalityId,
            },
            { hovered: false },
          )
          hoveredLocalityId = undefined
        }

        hideDemonstrationSite()
        hideTarget2050Candidate()
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
  installLivingWater(map)
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

  map.addLayer({
    id: 'auckland-localities-labels',
    type: 'symbol',
    source: 'auckland-localities',
    minzoom: 10.25,
    layout: {
      visibility: 'none',
      'text-field': '',
      'text-font': ['Noto Sans Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10.25,
        10,
        12,
        13,
        14,
        16,
      ],
      'text-letter-spacing': 0.02,
      'text-max-width': 8,
      'text-padding': 22,
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-optional': true,
      'symbol-placement': 'point',
    },
    paint: {
      'text-color': exGamesPalette.kauriDark,
      'text-halo-color': exGamesPalette.mist,
      'text-halo-width': 2,
      'text-halo-blur': 0.4,
      'text-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10.25,
        0.72,
        12,
        0.92,
        14,
        1,
      ],
    },
  })

  map.addLayer({
    id: 'auckland-localities-selected-label',
    type: 'symbol',
    source: 'auckland-localities',
    minzoom: 9,
    layout: {
      visibility: 'none',
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        9,
        12,
        11,
        15,
        14,
        19,
      ],
      'text-letter-spacing': 0.035,
      'text-max-width': 9,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'symbol-placement': 'point',
    },
    paint: {
      'text-opacity': [
        'case',
        [
          'any',
          ['boolean', ['feature-state', 'selected'], false],
          ['boolean', ['feature-state', 'hovered'], false],
        ],
        1,
        0,
      ],
      'text-color': [
        'case',
        [
          'any',
          ['boolean', ['feature-state', 'selected'], false],
          ['boolean', ['feature-state', 'hovered'], false],
        ],
        exGamesPalette.kauriDark,
        'rgba(0, 0, 0, 0)',
      ],
      'text-halo-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        exGamesPalette.leafLime,
        exGamesPalette.mist,
      ],
      'text-halo-width': [
        'case',
        [
          'any',
          ['boolean', ['feature-state', 'selected'], false],
          ['boolean', ['feature-state', 'hovered'], false],
        ],
        3,
        0,
      ],
      'text-halo-blur': 0.45,
    },
  })

  map.addControl(new AucklandRegionControl(), 'top-left')

  map.addSource('target-2050-candidates', {
    type: 'geojson',
    data: firstTarget2050Candidate,
  })

  map.addLayer({
    id: 'target-2050-candidate',
    type: 'circle',
    source: 'target-2050-candidates',
    layout: {
      visibility: 'none',
    },
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        7,
        13,
        13,
      ],
      'circle-color': exGamesPalette.leafLime,
      'circle-stroke-color': exGamesPalette.kauriDark,
      'circle-stroke-width': 3,
      'circle-opacity': 0.95,
    },
  })

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
    const revealsDemonstrationSite = localityName === 'Auckland Central'
    const revealsTarget2050Candidate = localityName === 'Manurewa'
    const revealsRiverheadParticipants = localityName === 'Riverhead'

    participantPanel.hidden = !revealsRiverheadParticipants

    if (revealsRiverheadParticipants) {
      showRiverheadParticipants()
    }

    map.setLayoutProperty(
      'living-map-area-fill',
      'visibility',
      revealsDemonstrationSite ? 'visible' : 'none',
    )
    map.setLayoutProperty(
      'living-map-area-outline',
      'visibility',
      revealsDemonstrationSite ? 'visible' : 'none',
    )
    map.setLayoutProperty(
      'target-2050-candidate',
      'visibility',
      revealsTarget2050Candidate ? 'visible' : 'none',
    )

    if (revealsRiverheadParticipants) {
      return
    }

    new maplibregl.Popup({ className: 'ex-games-popup' })
      .setLngLat(event.lngLat)
      .setHTML(
        revealsDemonstrationSite
          ? `
            <strong>${localityName}</strong>
            <p>1 contained Site revealed</p>
            <small>Select the Demonstration Site to inspect it.</small>
          `
          : revealsTarget2050Candidate
            ? `
              <div class="ex-games-popup__brand">
                <span>${exGamesBrand.name}</span>
                <small>${exGamesBrand.mission}</small>
              </div>
              <strong>${localityName}</strong>
              <p>1 active Target 2050 candidate revealed</p>
              <small>Select the green candidate marker to inspect it.</small>
            `
            : `
              <strong>${localityName}</strong>
              <p>No Living Map candidates registered yet.</p>
            `,
      )
      .addTo(map)
  })

  map.on('mousemove', 'auckland-localities-fill', (event) => {
    map.getCanvas().style.cursor = 'pointer'

    const feature = event.features?.[0]

    if (!feature || feature.id === undefined) {
      return
    }

    if (
      hoveredLocalityId !== undefined &&
      hoveredLocalityId !== feature.id
    ) {
      map.setFeatureState(
        {
          source: 'auckland-localities',
          id: hoveredLocalityId,
        },
        { hovered: false },
      )
    }

    hoveredLocalityId = feature.id
    map.setFeatureState(
      {
        source: 'auckland-localities',
        id: hoveredLocalityId,
      },
      { hovered: true },
    )
  })

  map.on('mouseleave', 'auckland-localities-fill', () => {
    map.getCanvas().style.cursor = ''

    if (hoveredLocalityId !== undefined) {
      map.setFeatureState(
        {
          source: 'auckland-localities',
          id: hoveredLocalityId,
        },
        { hovered: false },
      )
      hoveredLocalityId = undefined
    }
  })

  map.on('click', 'target-2050-candidate', (event) => {
    const feature = event.features?.[0]
    const properties = feature?.properties

    if (!feature || !properties) {
      return
    }

    new maplibregl.Popup({ className: 'ex-games-popup' })
      .setLngLat(event.lngLat)
      .setHTML(`
        <div class="ex-games-popup__brand">
          <span>${exGamesBrand.name}</span>
          <small>${exGamesBrand.mission}</small>
        </div>
        <strong>${properties.name}</strong>
        <p>${properties.localityName} · ${properties.status}</p>
        <p>${properties.mission}</p>
        <dl class="ex-games-candidate-facts">
          <div>
            <dt>Community lead</dt>
            <dd>${properties.leadOrganisation}</dd>
          </div>
          <div>
            <dt>Target alignment</dt>
            <dd>${properties.targetAlignment}</dd>
          </div>
          <div>
            <dt>Verified</dt>
            <dd>${properties.verifiedDate}</dd>
          </div>
        </dl>
        <p class="ex-games-candidate-links">
          <a href="${properties.evidenceUrl}" target="_blank" rel="noreferrer">
            Programme evidence
          </a>
          <a href="${properties.currentEvidenceUrl}" target="_blank" rel="noreferrer">
            Current activity
          </a>
        </p>
        <small>${properties.positionStatus}</small>
      `)
      .addTo(map)
  })

  map.on('mouseenter', 'target-2050-candidate', () => {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'target-2050-candidate', () => {
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

participantPanel.addEventListener('click', (event) => {
  const target = event.target as HTMLElement

  const card = target.closest<HTMLElement>('.participant-card')
  if (card?.dataset.id) {
    showParticipant(card.dataset.id)
    return
  }

  if (target.closest('.participant-back')) {
    showRiverheadParticipants()
  }
})
