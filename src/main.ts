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
let activeParticipantLocality: string | undefined
const claimedParticipants = new Set<string>()
const participantEdits = new Map<string, Record<string, string>>()
const verificationContacts = new Map<string, { email?: string; mobile?: string }>()
const verificationTargets = new Map<string, string>()

const getParticipant = (id: string) => {
  const base = riverheadParticipants.find((item) => item.id === id)
  if (!base) return undefined
  const edits = participantEdits.get(id)
  return edits ? { ...base, ...edits, activities: edits.activities?.split(',').map((v) => v.trim()).filter(Boolean) ?? base.activities } : base
}

const showParticipants = (localityName: string) => {
  const participants = riverheadParticipants.filter(
    (item) => item.locality === localityName,
  )
  activeParticipantLocality = localityName
  participantPanel.hidden = false
  participantPanel.innerHTML = `
    <div class="participant-panel__head">
      <small>${localityName.toUpperCase()}</small>
      <h2>Participants</h2>
      <p>${participants.length} currently on the map</p>
      <input class="participant-search"
        placeholder="Are you on the map?" />
       <div class="participant-actions">
         <button class="participant-action">Add yourself / your organisation</button>
         <button class="participant-action">Remove my listing</button>
       </div>
    </div>
    <div class="participant-list">
      ${participants.map((p) => `
        <button class="participant-card" data-id="${p.id}">
          <strong>${p.name}</strong>
          <small>${p.type}</small>
          <span>${p.summary}</span>
          <em class="participant-claim-status ${p.profileClaimed || claimedParticipants.has(p.id)
? 'participant-claim-status--claimed' : ''}">
            ${p.profileClaimed || claimedParticipants.has(p.id)
? 'PROFILE CLAIMED · UPDATE PROFILE'
: 'IS THIS YOU? · CLAIM PROFILE'}
          </em>
        </button>`).join('')}
    </div>`
}

const showParticipant = (id: string) => {
  const p = getParticipant(id)
  if (!p) return

  participantPanel.innerHTML = `
    <button class="participant-back">← Riverhead participants</button>
    <small>${p.type.toUpperCase()}</small>
    <h2>${p.name}</h2>
    <p>Review and adjust your information before claiming this profile.</p>
    <label>Name<input name="name" value="${p.name}"></label>
    <label>Relationship<textarea name="relationship">${p.relationship}</textarea></label>
    <label>Summary<textarea name="summary">${p.summary}</textarea></label>
    <label>Activities<input name="activities" value="${p.activities.join(', ')}"></label>
    <label>Detail<textarea name="detail">${p.detail ?? ''}</textarea></label>
<label>Website<input name="website" value="${p.website ?? ''}"></label>
    <small>Change, add or remove anything before continuing.</small>
    <button class="participant-profile-action" data-id="${p.id}">${p.profileClaimed || claimedParticipants.has(p.id) ? 'Save updates' : 'Claim profile'}</button>
  `
}

const showVerification = (id: string) => {
const p = getParticipant(id)
if (!p) return
participantPanel.innerHTML = `
<button class="verification-back" data-id="${p.id}" data-stage="contact">← Back</button>
<small>CLAIM PENDING</small>
<h2>Verify your claim</h2>
<p>${p.name}</p>
<p>Choose email or mobile to verify your claim.</p>
<label>Email<input name="verify-email" type="email"></label>
<div class="verification-or">OR</div>
<label>Mobile<input name="verify-mobile" type="tel"></label>
<button class="participant-verify" data-id="${p.id}">Send verification code</button>
`
}

const showVerificationMethod = (id: string) => {
const c = verificationContacts.get(id)
if (!c) return
participantPanel.innerHTML = `
<button class="verification-back" data-id="${id}" data-stage="method">← Back</button>
<small>CLAIM PENDING</small>
<h2>Choose verification method</h2>
${c.email ? `<button class="verify-method" data-id="${id}" data-method="email">Email · ${c.email}</button>` : ''}
${c.mobile ? `<button class="verify-method" data-id="${id}" data-method="mobile">SMS · ${c.mobile}</button>` : ''}
`
}

const showVerificationCode = (id: string) => {
const p = getParticipant(id)
if (!p) return
participantPanel.innerHTML = `
<button class="verification-back" data-id="${p.id}" data-stage="code">← Back</button>
<small>CLAIM PENDING</small>
<h2>Enter verification code</h2>
<p>${p.name}</p>
<p>Verification code sent to ${verificationTargets.get(id) ?? 'your chosen contact method'}.</p>
<label>Verification code<input name="verification-code" inputmode="numeric"></label>
<button class="participant-confirm-verify" data-id="${p.id}">Verify code</button>
`
}

const showClaimedParticipant = (id: string) => {
  const p = getParticipant(id)
  if (!p) return
  participantPanel.innerHTML = `
    <button class="participant-back">← Riverhead participants</button>
    <small>${p.type.toUpperCase()}</small>
    <h2>${p.name}</h2>
    <p>${p.relationship}</p>
    <div class="participant-tags">${p.activities.map((a) => `<span>${a}</span>`).join('')}</div>
    ${p.detail ? `<p>${p.detail}</p>` : ''}
    ${p.website ? `<p>${p.website}</p>` : ''}
    <button class="participant-update" data-id="${p.id}">Update my details</button>
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
    const revealsParticipants = riverheadParticipants.some(
  (participant) => participant.locality === localityName,
)

    participantPanel.hidden = !revealsParticipants

    if (revealsParticipants) {
      showParticipants(localityName)
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

    if (revealsParticipants) {
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
const action = target.closest<HTMLElement>('.participant-profile-action')
if (action?.dataset.id) {
const fields = participantPanel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[name]')
const edits: Record<string, string> = {}
fields.forEach((field) => { edits[field.name] = field.value })
participantEdits.set(action.dataset.id, edits)
if (claimedParticipants.has(action.dataset.id)) {
showClaimedParticipant(action.dataset.id)
} else {
showVerification(action.dataset.id)
}
return
}
const verify = target.closest<HTMLElement>('.participant-verify')
if (verify?.dataset.id) {
const email = participantPanel.querySelector<HTMLInputElement>('[name="verify-email"]')?.value.trim()
const mobile = participantPanel.querySelector<HTMLInputElement>('[name="verify-mobile"]')?.value.trim()
if (!email && !mobile) {
alert('Please enter an email address or mobile number.')
return
}
verificationContacts.set(verify.dataset.id, { email, mobile })
if (email && mobile) showVerificationMethod(verify.dataset.id)
else {
verificationTargets.set(verify.dataset.id, email || mobile || '')
showVerificationCode(verify.dataset.id)
}
return
}
const back = target.closest<HTMLElement>('.verification-back')
if (back?.dataset.id) {
const id = back.dataset.id
if (back.dataset.stage === 'contact') showParticipant(id)
else if (back.dataset.stage === 'method') showVerification(id)
else {
const c = verificationContacts.get(id)
c?.email && c?.mobile ? showVerificationMethod(id) : showVerification(id)
}
return
}
const update = target.closest<HTMLElement>('.participant-update')
if (update?.dataset.id) {
showParticipant(update.dataset.id)
return
}
const card = target.closest<HTMLElement>('.participant-card')
if (card?.dataset.id) {
claimedParticipants.has(card.dataset.id)
? showClaimedParticipant(card.dataset.id)
: showParticipant(card.dataset.id)
return
}
if (target.closest('.participant-back') && activeParticipantLocality) {
  showParticipants(activeParticipantLocality)
}
})
