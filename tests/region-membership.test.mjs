import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier+'.ts',context.parentURL);if(fs.existsSync(fileURLToPath(url)))return next(url.href,context)}
  return next(specifier,context)
}})
const record={id:'existing-hamilton-record',name:'Hamilton example',status:'located',localities:['Hamilton']}
globalThis.fetch=async path=>({ok:true,json:async()=>path==='/data/participant-regional-datasets.json'?{datasets:[{region:'Waikato',path:'/fixture.json'}]}:path==='/fixture.json'?{participants:[record]}:{areaModel:'EXG-LM-AREA-MODEL-002',areas:[]}})
const {participantInRegion,participantInLocality,loadLocatedParticipants}=await import('../src/potentialParticipants.ts')
const {searchParticipants}=await import('../src/search/match.ts')
test('selector region names find the existing broad-locality record without creating another identity',async()=>{
  for(const region of ['Waikato','Waikato Region']){
    assert(participantInRegion(record.id,region))
    assert(participantInLocality(record.id,'Hamilton',region))
    assert.deepEqual((await loadLocatedParticipants('Hamilton',region)).map(p=>p.id),[record.id])
    assert.deepEqual(searchParticipants({name:record.name,region}).candidates.map(c=>c.participant.id),[record.id])
  }
  assert.equal(participantInRegion(record.id,'Auckland Region'),false)
  assert.equal(participantInLocality(record.id,'Huntington','Waikato Region'),false)
  assert.equal(searchParticipants({name:record.name,region:'Auckland Region'}).candidates.length,0)
})
