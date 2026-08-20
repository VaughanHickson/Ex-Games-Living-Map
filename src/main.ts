import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import { firstLivingMapArea } from './areas'
import { nzLocalitiesUrl } from './localities'
import { nzRegions } from './regions'
import { exGamesBrand, exGamesPalette } from './brand'
import { firstTarget2050Candidate } from './candidates'
import { riverheadParticipants } from './participants'
import {
  locatedParticipants,
  loadLocatedParticipants,
} from './potentialParticipants'
import { searchParticipants } from './search'
import type { HitListData } from './hit-list'
import {
  knowledgeCompleteness,
  openKnowledgeTasks,
  deriveHitListMissionCandidates,
} from './hit-list'
import { installLivingWater } from './water/worldWater'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Living Map application root was not found.')
}

app.innerHTML = '<div id="map" aria-label="Interactive map of Aotearoa New Zealand"></div>'

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [174.7633, -36.8485],
  zoom: 9.5,
  bearing: 0,
  pitch: 0,
})

class FindMeControl implements maplibregl.IControl {
  private container?: HTMLDivElement
  onAdd(): HTMLElement {
    this.container = document.createElement('div')
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    const button = document.createElement('button')
    button.className = 'ex-games-find-me'
    button.type = 'button'
    button.textContent = 'Find me / Add me'
    button.setAttribute('aria-label', 'Find yourself or add yourself to the Living Map')
    this.container.appendChild(button)
    return this.container
  }
  onRemove() { this.container?.remove(); this.container = undefined }
}
map.addControl(new FindMeControl(), 'top-left')

class HitListControl implements maplibregl.IControl {
  private container?: HTMLDivElement
  onAdd(): HTMLElement {
    this.container=document.createElement('div')
    this.container.className='maplibregl-ctrl maplibregl-ctrl-group'
    const b=document.createElement('button')
    b.className='ex-games-hit-list'
    b.type='button'
    b.textContent='The Hit List'
    b.setAttribute('aria-label','Open the Ex Games Hit List')
    this.container.appendChild(b)
    return this.container
  }
  onRemove(){this.container?.remove();this.container=undefined}
}
map.addControl(new HitListControl(), 'top-left')


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

const hitListDossier = document.createElement('main')
hitListDossier.className = 'hit-list-dossier'
hitListDossier.hidden = true
app.appendChild(hitListDossier)

const hitListData = await fetch('/data/hit-list-001.json')
  .then(r => r.json()) as HitListData
let hoveredLocalityId: string | number | undefined
let activeParticipantLocality: string | undefined
let participantReturn:
  | { kind: 'search' }
  | { kind: 'locality'; locality: string }
  | undefined
let discoveredParticipants = [...locatedParticipants]

const claimedParticipants = new Set<string>()
const participantEdits = new Map<string, Record<string, string>>()
const participantSelectedLocality = new Map<string, string>()
let availableLocalities: { name: string; region: string }[] = []
const verificationContacts = new Map<string, { email?: string; mobile?: string }>()
const verificationTargets = new Map<string, string>()

const getParticipant = (id: string) => {
  const discovered = discoveredParticipants.find((item) => item.id === id)
  if (!discovered) return undefined

  const legacy = riverheadParticipants.find((item) => item.id === id)

  const base = {
    ...discovered,
    relationship: discovered.relationship ?? legacy?.relationship ?? '',
    summary: discovered.summary ?? legacy?.summary ?? '',
    activities: discovered.activities ?? legacy?.activities ?? [],
    detail: discovered.detail ?? legacy?.detail ?? '',
    website: discovered.website ?? legacy?.website ?? '',
    profileClaimed: legacy?.profileClaimed ?? false,
  }

  const edits = participantEdits.get(id)

  return edits
    ? {
        ...base,
        ...edits,
        activities:
          edits.activities?.split(',').map((v) => v.trim()).filter(Boolean) ??
          base.activities,
      }
    : base
}

const showHitList = () => {
  participantPanel.hidden=false
  const sections=hitListData.sections.map(sec => {
    const rows=hitListData.entries.filter(e =>
      e.sectionId===sec.id && !e.parentId
    )
    return `<section class="hit-list-section">
      <h2>${sec.label}</h2><p>${sec.description}</p>
      ${rows.map(e => `<button class="hit-list-entry"
        data-hit-id="${e.id}">
        <strong>${e.name}</strong>
        <small>${e.targetScope.replaceAll('_',' ')}</small>
        <small>${knowledgeCompleteness(e)}% developed ·
          ${openKnowledgeTasks(e).length} open tasks</small>
      </button>`).join('')}
    </section>`
  }).join('')
  participantPanel.innerHTML=`<small>THE HIT LIST</small>
    <h1>Know. Investigate. Discuss.</h1>${sections}
    <button class="participant-close">Close</button>`
}

const hitListSlug = (name: string) =>
  name.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'')

const hitListEntryFromPath = () => {
  const match=location.pathname.match(/^\/hit-list\/([^/]+)\/?$/)
  if (!match) return undefined
  return hitListData.entries.find(
    entry => hitListSlug(entry.name)===match[1]
  )
}

const showHitListEntry = (id: string, navigate=true) => {
  const e=hitListData.entries.find(x => x.id===id)
  if (!e) return
  participantPanel.hidden=true
  hitListDossier.hidden=false
  const mapEl=document.querySelector<HTMLElement>('#map')
  if (mapEl) mapEl.hidden=true
  const path=`/hit-list/${hitListSlug(e.name)}`
  if (navigate && location.pathname!==path)
    history.pushState({hitListId:id},'',path)
  const children=hitListData.entries.filter(x => x.parentId===id)
  hitListDossier.innerHTML=`
    <div class="hit-list-dossier-head">
      <button class="hit-list-back">← The Hit List</button>
      <div>
        <small>NZ EX GAMES · THE HIT LIST</small>
        <h1>${e.name}</h1>
        <p>${e.summary}</p>
      </div>
      <div class="hit-list-dossier-status">
        <strong>${e.targetScope.replaceAll('_',' ').toUpperCase()}</strong>
        <span>${knowledgeCompleteness(e)}% developed</span>
      </div>
    </div>
    <h3>VISUAL INTELLIGENCE</h3>
    <div class="hit-list-visuals">
      ${e.media.length ? e.media.map(m=>`
        <figure>
          <img src="${m.url}" alt="${m.caption ?? e.name}">
          <figcaption><strong>${m.role}</strong>
          ${m.caption ? ` · ${m.caption}` : ''}</figcaption>
        </figure>`).join('') :
        `<div class="hit-list-visual-gap">
          <strong>OPEN VISUAL INTELLIGENCE</strong>
          <span>Subject · identification · signs · impacts ·
          comparisons · habitat</span>
        </div>`}
    </div>
    <h3>KNOW</h3>
    <div class="hit-list-know">
      <div class="hit-list-know__item">
        <strong>WHAT</strong>${e.what}
      </div>
      <div class="hit-list-know__item">
        <strong>WHERE</strong>${e.where || 'OPEN INTELLIGENCE GAP'}
      </div>
      <div class="hit-list-know__item">
        <strong>WHY</strong>${e.why}
      </div>
    </div>
    ${e.scientificName ? `<p><em>${e.scientificName}</em></p>` : ''}
    ${children.length ? `
      <h3>SPECIES IN THIS GROUP</h3>
      <div class="hit-list-children">
        ${children.map(c=>`<button class="hit-list-entry"
          data-hit-id="${c.id}">${c.name}</button>`).join('')}
      </div>
    ` : ''}
    <h3>FIELD OBSERVATIONS</h3>
    ${e.fieldObservations.length
      ? e.fieldObservations.map(o =>
        `<p><strong>${o.observationType.replaceAll('_',' ')}</strong><br>
        ${o.summary}${o.locality ? ` · ${o.locality}` : ''}</p>`
      ).join('')
      : '<p>No field observations recorded yet.</p>'}
    <h3>INVESTIGATE</h3>
    <p><strong>${knowledgeCompleteness(e)}% developed</strong> ·
      ${openKnowledgeTasks(e).length} open tasks</p>
    <div class="hit-list-missions">
      <h3>MISSIONS AVAILABLE</h3>
      ${deriveHitListMissionCandidates(e).map(m=>`
        <button class="hit-list-mission" data-mission-id="${m.id}">
          <small>${m.mode.replaceAll('_',' ').toUpperCase()}</small>
          <strong>${m.title}</strong>
          <span>Open mission →</span>
        </button>`).join('')}
    </div>
    ${openKnowledgeTasks(e).map(c =>
      `<p><strong>${c.label}</strong> · ${c.status.replaceAll('_',' ')}</p>`
    ).join('')}
    ${e.researchQuestions.map(q=>`<p>${q}</p>`).join('')}
    <h3>COMMENTARY</h3>
    ${e.commentary.length
      ? e.commentary.map(c => `<p><strong>${c.text}</strong> · ${c.supporterCount}</p>`).join('')
      : `<p>${e.discussionEnabled
        ? 'Commentary enabled — community layer reserved.'
        : 'Commentary not enabled.'}</p>`}
    `
}

window.addEventListener('popstate',() => {
  const entry=hitListEntryFromPath()
  if (entry) {
    showHitListEntry(entry.id,false)
    return
  }

  hitListDossier.hidden=true
  participantPanel.hidden=true
  const mapEl=document.querySelector<HTMLElement>('#map')
  if (mapEl) mapEl.hidden=false
})

hitListDossier.addEventListener('click',(event) => {
  const target=event.target as HTMLElement
  const child=target.closest<HTMLElement>('.hit-list-entry')
  if (child?.dataset.hitId) {
    showHitListEntry(child.dataset.hitId)
    return
  }
  if (target.closest('.hit-list-back')) {
    if (history.length > 1) {
      history.back()
    } else {
      history.replaceState({},'','/')
      hitListDossier.hidden=true
      const mapEl=document.querySelector<HTMLElement>('#map')
      if (mapEl) mapEl.hidden=false
      showHitList()
    }
  }
})

const showFindMe = () => {
  activeParticipantLocality = undefined
  participantReturn = { kind:'search' }
  participantPanel.hidden = false
  participantPanel.innerHTML = `
    <div class="participant-panel__head">
      <small>LIVING MAP</small>
      <h2>Find yourself or your group</h2>
      <p>Search the Living Map. If we do not know you yet, you can add yourself.</p>
      <input class="participant-search"
        placeholder="Name, group, project or organisation" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" autofocus />
      <div class="participant-search-result" aria-live="polite"></div>
      <div class="participant-actions">
        <button class="participant-action">Add yourself / your organisation</button>
      </div>
    </div>
    <button class="participant-close">Close</button>`
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement
  if (target.closest(".ex-games-hit-list")) {
    showHitList()
    return
  }
  if (target.closest(".ex-games-find-me")) showFindMe()
})

const showParticipants = (localityName: string) => {
  const participants = discoveredParticipants.filter(
    (item) => item.locality === localityName,
  )
  activeParticipantLocality = localityName
  participantReturn = { kind:'locality', locality:localityName }
  participantPanel.hidden = false
  participantPanel.innerHTML = `
    <div class="participant-panel__head">
      <small>${localityName.toUpperCase()}</small>
      <h2>Located Participants</h2>
      <p>${participants.length} located on the map</p>
      <input class="participant-search"
        placeholder="Find yourself or your group" />
      <div class="participant-search-result" aria-live="polite"></div>
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
  <em class="participant-claim-status">
    IS THIS YOU? · VERIFY PROFILE
  </em>
</button>`).join('')}
    </div>
    <button class="participant-close">Close</button>`
}

const openSearchMatch = (name: string, locality?: string) => {
  const result = searchParticipants({ name, locality }, discoveredParticipants)

  if (result.outcome !== 'EXISTING_MATCH') return result

  const match = result.candidates[0]
  if (!match) return result

  participantReturn = locality
    ? { kind: 'locality', locality }
    : { kind: 'search' }
  showParticipant(match.participant.id)

  return result
}

const showParticipant = (id: string) => {
  const p = getParticipant(id)
  if (!p) return

  participantPanel.innerHTML = `
    <button class="participant-edit-back" data-id="${p.id}">${
      participantReturn?.kind === 'search'
        ? '← Back to search'
        : `← ${participantReturn?.locality ?? p.locality} participants`
    }</button>
    <small>${p.type.toUpperCase()}</small>
    <h2>${p.name}</h2>
    <p>Review and adjust your information before verifying this profile.</p>
    <label>Name<input name="name" value="${p.name}"></label>
    <label>Relationship<textarea name="relationship">${p.relationship}</textarea></label>
    <label>Summary<textarea name="summary">${p.summary}</textarea></label>
    <label>Activities<input name="activities" value="${p.activities.join(', ')}"></label>
    <label>Detail<textarea name="detail">${p.detail ?? ''}</textarea></label>
<label>Website<input name="website" value="${p.website ?? ''}"></label>
    <label>Living Map locality
      <select name="claimed-locality">
        ${availableLocalities
          .filter(x => x.region === p.region)
          .map(x => `<option value="${x.name}" ${
            x.name === (participantSelectedLocality.get(id) ?? p.locality)
              ? 'selected'
              : ''
          }>${x.name}</option>`).join('')}
      </select>
    </label>
    <small>Change, add or remove anything before continuing.</small>
    <button class="participant-profile-action" data-id="${p.id}">${p.profileClaimed || claimedParticipants.has(p.id) ? 'Save updates' : 'Verify profile'}</button>
  `
}

const showLocalitySelection = (id: string) => {
  const p = getParticipant(id)
  if (!p) return
  const selected = participantSelectedLocality.get(id) ?? p.locality
  participantPanel.innerHTML = `
    <small>MAP LOCATION</small>
    <h2>Where should this profile appear?</h2>
    <p>Choose a suburb or locality deliberately. You can change it later.</p>
    <label>Locality
      <select name="claimed-locality">
        ${availableLocalities
          .filter(x => x.region === p.region)
          .map(x => `<option value="${x.name}" ${
            x.name === selected ? 'selected' : ''
          }>${x.name}</option>`).join('')}
      </select>
    </label>
    <button class="participant-locality-confirm" data-id="${id}">Review location</button>
    <button class="participant-locality-back" data-id="${id}">Back</button>`
}

const showLocalityConfirmation = (id: string) => {
  const p = getParticipant(id)
  const locality = participantSelectedLocality.get(id)
  if (!p || !locality) return
  participantPanel.innerHTML = `
    <small>CONFIRM MAP LOCATION</small>
    <h2>${locality}</h2>
    <p>Your profile will appear in this locality on the Living Map.</p>
    <button class="participant-locality-accept" data-id="${id}">Confirm and continue</button>
    <button class="participant-locality-change" data-id="${id}">Change locality</button>`
}

const showVerification = (id: string) => {
const p=getParticipant(id)
if (!p) return
participantPanel.innerHTML=`
<button class="verification-back" data-id="${id}" data-stage="contact">← Back to profile</button>
<small>VERIFICATION PENDING</small>
<h2>Verify your profile</h2>
<p>${p.name}</p>
<p>Choose email or mobile to verify your profile.</p>
<label>Email<input name="verify-email" type="email"></label>
<div class="verification-or">OR</div>
<label>Mobile<input name="verify-mobile" type="tel"></label>
<button class="participant-verify" data-id="${id}">Send verification code</button>`
}

const showVerificationMethod = (id: string) => {
const c = verificationContacts.get(id)
if (!c) return
participantPanel.innerHTML = `
<button class="verification-back" data-id="${id}" data-stage="method">← Back</button>
<small>VERIFICATION PENDING</small>
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
<small>VERIFICATION PENDING</small>
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
    <button class="participant-back">← ${activeParticipantLocality ?? p.locality} participants</button>
    <small>${p.type.toUpperCase()}</small>
    <h2>${p.name}</h2>
    <p><strong>Living Map locality:</strong> ${participantSelectedLocality.get(id) ?? p.locality}</p>
    <p>${p.relationship}</p>
    <div class="participant-tags">${p.activities.map((a) => `<span>${a}</span>`).join('')}</div>
    ${p.detail ? `<p>${p.detail}</p>` : ''}
    ${p.website ? `<p>${p.website}</p>` : ''}
    <button class="participant-locality-change" data-id="${p.id}">Change locality</button>
    <button class="participant-update" data-id="${p.id}">Update my details</button>
  `
}



const setActiveRegion = (map: maplibregl.Map, region: string) => {
const layers=['auckland-localities-fill','auckland-localities-outline',
'auckland-localities-selected-fill','auckland-localities-selected-outline',
'auckland-localities-selected-label',
'dev-northland-authoritative-areas-fill',
'dev-northland-authoritative-areas-outline']
for (const id of layers) {
map.setFilter(id,region ? ['==',['get','region'],region] : null)
map.setLayoutProperty(id,'visibility',region ? 'visible' : 'none')
}
}

class RegionControl implements maplibregl.IControl {
private container?: HTMLDivElement
onAdd(controlMap: maplibregl.Map): HTMLElement {
this.container=document.createElement('div')
this.container.className='maplibregl-ctrl maplibregl-ctrl-group'
const select=document.createElement('select')
select.className='ex-games-region-control'
select.setAttribute('aria-label','Select your region')
select.innerHTML='<option value="">SELECT YOUR REGION</option>'+nzRegions.map(([label,value])=>`<option value="${value}">${label}</option>`).join('')
select.addEventListener('change',()=>setActiveRegion(controlMap,select.value))
this.container.appendChild(select)
return this.container
}
onRemove(){this.container?.remove();this.container=undefined}
}

map.on('load', async () => {
  installLivingWater(map)

  const localityData = await fetch(nzLocalitiesUrl).then(r => r.json())
  availableLocalities = localityData.features
    .map((f: any) => ({
      name: f.properties?.name,
      region: f.properties?.region,
    }))
    .filter((x: any) =>
      typeof x.name === 'string' && typeof x.region === 'string'
    )


  map.addSource('auckland-localities', {
    type: 'geojson',
    data: nzLocalitiesUrl,
    attribution: 'NZ Suburbs and Localities © LINZ',
    generateId: true,
  })

  // Area Model 002 development proof: authoritative Northland landscape Areas.
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

  map.addControl(new RegionControl(), 'top-left')

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
    activeParticipantLocality = localityName
    participantPanel.hidden = true

    loadLocatedParticipants(localityName)
      .then((participants) => {
        if (!participants.length) {
          activeParticipantLocality = undefined
          return
        }
        showParticipants(localityName)
      })
      .catch((error) => {
        console.warn(`Participant discovery failed for ${localityName}.`, error)
      })

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
            : '',
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

  map.on('click', 'dev-northland-authoritative-areas-fill', (event) => {
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

const showSearchResult = (message: string, candidates: readonly any[] = []) => {
  const result = participantPanel.querySelector<HTMLElement>('.participant-search-result')
  if (!result) return
  result.innerHTML = `<p>${message}</p>` + candidates.map((c) => `
    <button class="participant-search-candidate" data-id="${c.participant.id}">
      <strong>${c.participant.name}</strong>
      <small>${c.participant.type} · ${c.participant.locality}</small>
    </button>`).join('')
}

participantPanel.addEventListener('keydown', (event) => {
  const target = event.target as HTMLInputElement

  if (!target.matches('.participant-search')) return
  if (event.key !== 'Enter') return

  const query = target.value.trim()
  if (!query) return

  const result = openSearchMatch(
    query,
    activeParticipantLocality,
  )

  event.preventDefault()

  if (result.outcome === 'EXISTING_MATCH') return

  if (result.outcome === 'POSSIBLE_MATCH') {
    showSearchResult('Possible match:', result.candidates)
    return
  }

  if (result.outcome === 'MULTIPLE_MATCHES') {
    showSearchResult('Possible matches:', result.candidates)
    return
  }

  showSearchResult('No existing participant found. You can continue to register.')
})

participantPanel.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement
  if (!target.matches('.participant-search')) return
  const query = target.value.trim()
  if (!query) { showSearchResult(''); return }
  const result = searchParticipants(
    { name: query, locality: activeParticipantLocality },
    discoveredParticipants,
  )
  if (result.outcome === 'NO_MATCH')
    showSearchResult('No existing participant found.')
  else
    showSearchResult(
      result.outcome === 'EXISTING_MATCH' ? 'Existing match:' : 'Possible matches:',
      result.candidates,
    )
})

participantPanel.addEventListener('click', (event) => {
const target = event.target as HTMLElement
const hit = target.closest<HTMLElement>('.hit-list-entry')
if (hit?.dataset.hitId) {
  showHitListEntry(hit.dataset.hitId)
  return
}
if (target.closest('.hit-list-back')) {
  showHitList()
  return
}
const candidate = target.closest<HTMLElement>(".participant-search-candidate")
if (candidate?.dataset.id) {
  participantReturn = activeParticipantLocality
    ? { kind:'locality', locality:activeParticipantLocality }
    : { kind:'search' }
  showParticipant(candidate.dataset.id)
  return
}

if (target.closest('.participant-close')) {
  participantPanel.hidden = true
  activeParticipantLocality = undefined
  return
}
const addParticipant = target.closest<HTMLElement>('.participant-action')
if (addParticipant?.textContent?.includes('Add yourself')) {
  const search = participantPanel.querySelector<HTMLInputElement>('.participant-search')
  const query = search?.value.trim() ?? ''

  if (!query) {
    showSearchResult('Search for yourself or your group first.')
    return
  }

  const result = searchParticipants({
    name: query,
    locality: activeParticipantLocality,
  }, discoveredParticipants)

  if (result.outcome === 'NO_MATCH') {
    showSearchResult('No existing participant found. Registration can begin from here.')
    return
  }

  showSearchResult('Review the existing or possible match before registering.')
  return
}

const editBack = target.closest<HTMLElement>('.participant-edit-back')
if (editBack?.dataset.id) {
  const discard = confirm(
    'Discard these changes? Your profile has not been verified or updated.'
  )
  if (!discard) return

  participantEdits.delete(editBack.dataset.id)
  participantSelectedLocality.delete(editBack.dataset.id)

  if (participantReturn?.kind === 'search') showFindMe()
  else if (participantReturn?.kind === 'locality')
    showParticipants(participantReturn.locality)

  return
}

const action = target.closest<HTMLElement>('.participant-profile-action')
if (action?.dataset.id) {
const fields = participantPanel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[name]')
const edits: Record<string, string> = {}
fields.forEach((field) => { edits[field.name] = field.value })
participantEdits.set(action.dataset.id, edits)
const locality=participantPanel.querySelector<HTMLSelectElement>('[name="claimed-locality"]')?.value
if (locality) participantSelectedLocality.set(action.dataset.id,locality)
if (claimedParticipants.has(action.dataset.id)) {
showClaimedParticipant(action.dataset.id)
} else {
showVerification(action.dataset.id)
}
return
}
const lc = target.closest<HTMLElement>('.participant-locality-confirm')
if (lc?.dataset.id) {
  const id=lc.dataset.id
  const v=participantPanel.querySelector<HTMLInputElement>('[name="claimed-locality"]')?.value.trim()
  if (!v || !availableLocalities.some(x => x.name === v)) {
    alert('Please choose a locality from the list.')
    return
  }
  participantSelectedLocality.set(id,v)
  showLocalityConfirmation(id)
  return
}
const lchange = target.closest<HTMLElement>('.participant-locality-change')
if (lchange?.dataset.id) {
  showLocalitySelection(lchange.dataset.id)
  return
}
const lback = target.closest<HTMLElement>('.participant-locality-back')
if (lback?.dataset.id) {
  showParticipant(lback.dataset.id)
  return
}
const laccept = target.closest<HTMLElement>('.participant-locality-accept')
if (laccept?.dataset.id) {
  showVerification(laccept.dataset.id)
  return
}
const verify = target.closest<HTMLElement>('.participant-verify')
if (verify?.dataset.id) {
const locality=participantPanel.querySelector<HTMLSelectElement>('[name="claimed-locality"]')?.value
if (!locality) {
alert('Please choose where this profile should appear.')
return
}
participantSelectedLocality.set(verify.dataset.id,locality)
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
const confirmVerify = target.closest<HTMLElement>('.participant-confirm-verify')
if (confirmVerify?.dataset.id) {
  const id=confirmVerify.dataset.id
  const code=participantPanel.querySelector<HTMLInputElement>('[name="verification-code"]')?.value.trim()
  if (!code) {
    alert('Please enter the verification code.')
    return
  }
  claimedParticipants.add(id)
  showClaimedParticipant(id)
  return
}
const back = target.closest<HTMLElement>('.verification-back')
if (back?.dataset.id) {
const id = back.dataset.id
if (!back.dataset.stage || back.dataset.stage === 'contact') {
showParticipant(id)
return
}
if (back.dataset.stage === 'method') showVerification(id)
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
if (activeParticipantLocality) {
participantReturn={kind:'locality',locality:activeParticipantLocality}
}
claimedParticipants.has(card.dataset.id)
? showClaimedParticipant(card.dataset.id)
: showParticipant(card.dataset.id)
return
}
const participantBack=target.closest<HTMLElement>('.participant-back')
if (participantBack) {
  if (participantReturn?.kind==='search') showFindMe()
  else if (participantReturn?.kind==='locality')
    showParticipants(participantReturn.locality)
  return
}
})

const initialHitListEntry=hitListEntryFromPath()
if (initialHitListEntry) {
  showHitListEntry(initialHitListEntry.id,false)
}
