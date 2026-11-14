import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildLocalityPositions, localityKey } from '../src/locality-positions.ts'
const feature=(name,major,region,west,east)=>({properties:{name,major_name:major,region},geometry:{type:'Polygon',coordinates:[[[west,-40],[east,-41],[west,-40]]]}})
test('broad city positions combine named suburbs without replacing exact localities or crossing regions',()=>{
  const positions=buildLocalityPositions([
    feature('West','City','One Region',170,171),feature('East','City','One Region',173,174),
    feature('City','Other','Two Region',175,176),feature('Outer','City','Two Region',179,180),
  ])
  assert.deepEqual(positions.get(localityKey('One','City')),[172,-40.5])
  assert.deepEqual(positions.get(localityKey('One','West')),[170.5,-40.5])
  assert.deepEqual(positions.get(localityKey('Two','City')),[175.5,-40.5])
  assert.equal(positions.has(localityKey('One','Unknown')),false)
})
test('canonical Hamilton geography provides a broad city marker while retaining every exact locality',()=>{
  const data=JSON.parse(fs.readFileSync('public/data/nz-suburbs-localities.geojson'))
  const before=JSON.stringify(data),positions=buildLocalityPositions(data.features)
  assert.equal(data.features.some(f=>f.properties.name==='Hamilton'),false)
  const suburbs=data.features.filter(f=>f.properties.major_name==='Hamilton'&&f.properties.region==='Waikato Region')
  assert(suburbs.length>1)
  const points=suburbs.flatMap(f=>f.geometry.coordinates.flat(f.geometry.type==='Polygon'?1:2))
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1])
  assert.deepEqual(positions.get(localityKey('Waikato','Hamilton')),[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2])
  for(const f of data.features){
    if(!f.properties.name||!f.properties.region)continue
    assert(positions.has(localityKey(f.properties.region,f.properties.name)))
  }
  assert.equal(JSON.stringify(data),before)
})
