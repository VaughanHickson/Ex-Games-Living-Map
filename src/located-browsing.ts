import type { Map as LivingMap, GeoJSONSource } from 'maplibre-gl'
import type { LocatedParticipant } from './participant-model'
import type { LocalityDisplayFeature } from './discoveryPrototype'
import { participantLocalities } from './potentialParticipants'

export const normaliseRegion = (value: string) => value.replace(/ Region$/, '').normalize('NFC')
const normaliseLocality = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
/** Draw sourced locality markers after a region is selected. */
export function installLocatedBrowsing(map: LivingMap, records: readonly LocatedParticipant[], localities: readonly LocalityDisplayFeature[], openLocality: (name: string) => void) {
  const source = 'located-localities'
  const layer = 'located-locality-markers'
  let currentFeatures: GeoJSON.FeatureCollection<GeoJSON.Point> = {type:'FeatureCollection',features:[]}
  const geometry = new Map<string, [number, number]>()
  for (const feature of localities) {
    const name=feature.properties?.name, r=feature.properties?.region
    if (!name || !r) continue
    const rings=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates.flat()
    const points=rings.flat()
    const west=Math.min(...points.map(p=>p[0])), east=Math.max(...points.map(p=>p[0]))
    const south=Math.min(...points.map(p=>p[1])), north=Math.max(...points.map(p=>p[1]))
    geometry.set(`${normaliseRegion(r)}:${normaliseLocality(name)}`,[(west+east)/2,(south+north)/2])
  }
  function ensureLayer() {
    if (!map.getSource(source)) map.addSource(source,{type:'geojson',data:currentFeatures})
    if (!map.getLayer(layer)) map.addLayer({id:layer,type:'circle',source,paint:{'circle-radius':7,'circle-color':'#b99039','circle-stroke-color':'#17251c','circle-stroke-width':2}})
  }
  function selectRegion(region: string) {
    const positions=new Map<string,GeoJSON.Feature<GeoJSON.Point>>()
    for (const p of region ? records : []) for (const m of participantLocalities(p.id)) {
      if (normaliseRegion(m.region) !== normaliseRegion(region)) continue
      const key=`${normaliseRegion(m.region)}:${normaliseLocality(m.locality)}`,coordinates=geometry.get(key)
      if(!coordinates)continue
      const feature=positions.get(key)??{type:'Feature' as const,geometry:{type:'Point' as const,coordinates},properties:{locality:m.locality,count:0}}
      feature.properties!.count++;positions.set(key,feature)
    }
    currentFeatures={type:'FeatureCollection',features:[...positions.values()]}
    ensureLayer();(map.getSource(source) as GeoJSONSource).setData(currentFeatures)
  }
  map.on('style.load',()=>{ensureLayer();(map.getSource(source) as GeoJSONSource).setData(currentFeatures)})
  map.on('click',layer,event=>{
    const name=event.features?.[0]?.properties?.locality
    if (typeof name === 'string') openLocality(name)
  })
  map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer'})
  map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor=''})
  selectRegion('')
  return {selectRegion}
}
