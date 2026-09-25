import type { Map as LivingMap } from 'maplibre-gl'
import { exGamesPalette } from './brand'
import { uniqueParticipants } from './participant-model'
import { areaFeatures, type AreaIndex } from './area-model'
import type { LocatedParticipant } from './participant-model'

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)

export function participantAreaMarkup(id: string, index: AreaIndex) {
  const areas = index.areasForParticipant(id)
  return `<section aria-label="Associated Areas"><h3>Associated Areas (${areas.length})</h3>${areas.length
    ? areas.map(a => `<button class="participant-area" data-area-id="${escapeHtml(a.id)}">${escapeHtml(a.name)} · ${escapeHtml(a.region)}</button>`).join('')
    : '<p>No Area relationships recorded.</p>'}</section>`
}

export function areaMarkup(id: string, index: AreaIndex, participants: readonly LocatedParticipant[]) {
  const area = index.areasById.get(id)
  if (!area) return '<p>Area unavailable.</p>'
  const related = uniqueParticipants(participants).filter(p => area.participantIds.includes(p.id))
  return `<small>AREA · ${escapeHtml(area.areaType)}</small><h2>${escapeHtml(area.name)}</h2>
    <p>${escapeHtml(area.region)}</p><p>${escapeHtml(area.boundaryStatus)} · ${escapeHtml(area.geometryStatus)}</p>
    ${area.description ? `<p>${escapeHtml(area.description)}</p>` : ''}
    ${!area.geometry ? '<p>Geometry unresolved or not attached; no map position is invented.</p>' : ''}
    <p>Source terms: ${area.sourceTerms.map(escapeHtml).join(', ') || 'None recorded'}</p>
    ${(area.sources ?? []).map(s => `<p>${escapeHtml(s)}</p>`).join('')}
    <h3>Participants (${related.length})</h3>
    ${related.length ? related.map(p => `<button class="area-participant" data-id="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>`).join('') : '<p>No participants associated.</p>'}
    <button class="participant-close">Close</button>`
}

export const areaLayerIds = ['canonical-areas-fill', 'canonical-areas-line', 'canonical-areas-point']
export function installAreaLayers(map: LivingMap, index: AreaIndex, select: (id: string) => void) {
  map.addSource('canonical-areas', { type: 'geojson', data: areaFeatures(index) })
  map.addLayer({ id: areaLayerIds[0], type: 'fill', source: 'canonical-areas',
    filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color':exGamesPalette.forestGreen, 'fill-opacity':0.22 } })
  map.addLayer({ id: areaLayerIds[1], type: 'line', source: 'canonical-areas',
    filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color':exGamesPalette.manukaGrey, 'line-width':2, 'line-opacity':0.78 } })
  map.addLayer({ id: areaLayerIds[2], type: 'circle', source: 'canonical-areas',
    filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color':exGamesPalette.forestGreen, 'circle-radius':6, 'circle-stroke-width':1.5, 'circle-stroke-color':exGamesPalette.manukaGrey } })
  // One handler avoids opening the same polygon twice through its fill/outline.
  map.on('click', event => {
    const feature = map.queryRenderedFeatures(event.point, { layers: areaLayerIds })[0]
    if (feature?.properties?.areaId) select(feature.properties.areaId)
  })
  for (const layer of areaLayerIds) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
  }
}
