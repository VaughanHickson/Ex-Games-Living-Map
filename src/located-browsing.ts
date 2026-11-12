import type { Map as LivingMap, GeoJSONSource } from 'maplibre-gl'
import type { LocatedParticipant } from './participant-model'
import type { LocalityDisplayFeature } from './discoveryPrototype'
import { participantInRegion, participantLocalities } from './potentialParticipants'

export const normaliseRegion = (value: string) => value.replace(/ Region$/, '').normalize('NFC')
const normaliseLocality = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const inRegion = (p: LocatedParticipant, region: string) => !region || participantLocalities(p.id)
  .some(m => normaliseRegion(m.region) === normaliseRegion(region)) || participantInRegion(p.id, region)

/** Browse the loaded sourced records, with locality markers rather than invented site coordinates. */
export function installLocatedBrowsing(map: LivingMap, records: readonly LocatedParticipant[], localities: readonly LocalityDisplayFeature[], open: (id: string) => void) {
  const shell = document.createElement('section')
  shell.className = 'located-browser'
  shell.setAttribute('aria-label', 'Located actors')
  shell.innerHTML = `<h2>Located actors</h2><p>LOCATED means a sourced public record, not ACTIVE participation.</p>
    <label>Find a Located actor<input type="search" aria-label="Find a Located actor"></label>
    <label>Actor type<select aria-label="Actor type"><option value="">All types</option></select></label>
    <p class="located-count" role="status"></p><p class="located-locality"></p>
    <button type="button" class="located-clear" hidden>Show all in region</button>
    <div class="located-list"></div><button type="button" class="located-more" hidden>Show more</button>
    <p class="located-marker-note">Markers show recorded localities, not exact work sites. Records without a mapped locality remain in the list.</p>`
  map.getContainer().parentElement!.append(shell)
  const input = shell.querySelector('input')!
  const type = shell.querySelector('select')!
  const list = shell.querySelector<HTMLElement>('.located-list')!
  const more = shell.querySelector<HTMLButtonElement>('.located-more')!
  const clear = shell.querySelector<HTMLButtonElement>('.located-clear')!
  let region = '', locality = '', limit = 40
  const source = 'located-localities'
  const layer = 'located-locality-markers'
  let currentFeatures: GeoJSON.FeatureCollection<GeoJSON.Point> = {type:'FeatureCollection',features:[]}
  let visible: readonly LocatedParticipant[] = []
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
  function render() {
    const query=input.value.trim().toLocaleLowerCase()
    visible=records.filter(p=>inRegion(p,region) && (!type.value||p.type===type.value)
      && (!query||`${p.name} ${p.locality} ${p.type}`.toLocaleLowerCase().includes(query))
      && (!locality||participantLocalities(p.id).some(m=>normaliseLocality(m.locality)===locality && (!region||normaliseRegion(m.region)===normaliseRegion(region)))))
      .sort((a,b)=>a.name.localeCompare(b.name))
    shell.querySelector('.located-count')!.textContent=`${visible.length} Located actors${region?' · '+region.replace(/ Region$/,''):''}`
    list.replaceChildren()
    for(const p of visible.slice(0,limit)) {
      const button=document.createElement('button');button.type='button';button.className='located-actor';button.dataset.id=p.id
      const name=document.createElement('strong');name.textContent=p.name
      const detail=document.createElement('small');detail.textContent=`${p.type} · ${p.locality || p.region}`
      button.append(name,detail);button.addEventListener('click',()=>open(p.id));list.append(button)
    }
    more.hidden=visible.length<=limit;clear.hidden=!locality
    const positions=new Map<string,GeoJSON.Feature<GeoJSON.Point>>()
    const showBrowseMarkers = Boolean(region || query || type.value || locality)
    for(const p of showBrowseMarkers ? visible : []) for(const m of participantLocalities(p.id)) {
      if(region&&normaliseRegion(m.region)!==normaliseRegion(region))continue
      const key=`${normaliseRegion(m.region)}:${normaliseLocality(m.locality)}`,coordinates=geometry.get(key)
      if(!coordinates)continue
      const feature=positions.get(key)??{type:'Feature' as const,geometry:{type:'Point' as const,coordinates},properties:{locality:m.locality,count:0}}
      feature.properties!.count++;positions.set(key,feature)
    }
    currentFeatures={type:'FeatureCollection',features:[...positions.values()]}
    ensureLayer();(map.getSource(source) as GeoJSONSource).setData(currentFeatures)
    shell.dataset.markerCount=String(currentFeatures.features.length)
  }
  map.on('style.load',()=>{ensureLayer();(map.getSource(source) as GeoJSONSource).setData(currentFeatures)})
  map.on('click',layer,event=>{
    const name=event.features?.[0]?.properties?.locality
    if(typeof name!=='string')return
    locality=normaliseLocality(name);limit=40;shell.querySelector('.located-locality')!.textContent=name;render()
    if (visible.length === 1) open(visible[0].id)
    else shell.scrollIntoView({block:'nearest'})
  })
  map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer'})
  map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor=''})
  input.addEventListener('input',()=>{limit=40;render()})
  type.addEventListener('change',()=>{limit=40;render()})
  more.addEventListener('click',()=>{limit+=40;render()})
  clear.addEventListener('click',()=>{locality='';shell.querySelector('.located-locality')!.textContent='';render()})
  function selectRegion(value: string) {
    region=value;locality='';limit=40;input.value='';type.value=''
    shell.querySelector('.located-locality')!.textContent=''
    type.replaceChildren(new Option('All types',''))
    for(const t of [...new Set(records.filter(p=>inRegion(p,region)).map(p=>p.type))].sort())type.append(new Option(t,t))
    render()
  }
  selectRegion('')
  return {selectRegion}
}
