import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import path from 'node:path'

const fixture = JSON.parse(await fs.readFile('tests/multi-area-fixture.json', 'utf8'))
const manifest = JSON.parse(await fs.readFile('public/data/participant-regional-datasets.json', 'utf8'))
const cache = path.resolve('node_modules/.cache')
await fs.mkdir(cache, { recursive:true })
const profile = await fs.mkdtemp(path.join(cache, 'multi-area-browser-'))
let browser, socket, server
let datasetMode = 'fixtures'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  server = await createServer({ configFile:false, envDir:false,
    optimizeDeps:{ exclude:['maplibre-gl'] },
    server:{ host:'127.0.0.1', port:0 },
    plugins:[{
      name:'multi-area-local-fixtures',
      transform(code, id) {
        if (id.endsWith('/src/main.ts')) return code + '\nwindow.__multiAreaTestMap = map;\n'
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/empty-glyphs/')) {
            res.setHeader('Content-Type','application/x-protobuf'); res.end(Buffer.alloc(0)); return
          }
          let payload
          if (req.url === '/data/areas.json') payload = datasetMode === 'empty'
            ? { areaModel:'EXG-LM-AREA-MODEL-002', areas:[] } : fixture.dataset
          else if (req.url === '/data/participant-regional-datasets.json') payload = {
            datasets:datasetMode === 'fixtures' ? [...manifest.datasets, { region:'Auckland', path:'/fixture-participants' }] : manifest.datasets,
          }
          else if (req.url === '/fixture-participants') payload = { participants:fixture.participants }
          if (!payload) return next()
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(payload))
        })
      },
    }],
  })
  await server.listen()
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new','--no-sandbox','--disable-background-networking','--disable-component-update',
    '--no-first-run','--no-default-browser-check','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank',
  ], { stdio:'ignore' })
  let port
  for (let i=0; i<100; i++) {
    try { port = (await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]; break } catch {}
    await sleep(100)
  }
  assert.ok(port, 'Chrome debugging port available')
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())
  socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open',resolve,{once:true}))
  let seq=0
  const pending=new Map(), errors=[]
  function send(method, params={}) {
    return new Promise((resolve,reject)=>{
      const id=++seq; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params}))
    })
  }
  socket.addEventListener('message', async event => {
    const msg=JSON.parse(event.data)
    if (msg.id) {
      const p=pending.get(msg.id);pending.delete(msg.id)
      if (msg.error) p?.reject(new Error(msg.error.message)); else p?.resolve(msg.result)
    }
    if (msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text)
    if (msg.method==='Fetch.requestPaused') {
      const { requestId, request } = msg.params
      if (request.url.startsWith(origin)) await send('Fetch.continueRequest',{requestId})
      else {
        // Entirely offline basemap substitute, retaining the layer IDs required by Living Water.
        const style = { version:8, glyphs:`${origin}/empty-glyphs/{fontstack}/{range}.pbf`, sources:{
          empty:{ type:'geojson',data:{type:'FeatureCollection',features:[]} },
        }, layers:[{ id:'background',type:'background',paint:{'background-color':'#e5e9e0'} },
          { id:'water',type:'fill',source:'empty' }, { id:'landcover_sand',type:'fill',source:'empty' }] }
        await send('Fetch.fulfillRequest',{requestId,responseCode:request.url.includes('tiles.openfreemap.org/styles/liberty')?200:403,
          responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],
          body:Buffer.from(JSON.stringify(style)).toString('base64')})
      }
    }
  })
  await send('Runtime.enable'); await send('Page.enable')
  await send('Fetch.enable',{patterns:[{urlPattern:'*'}]})
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
  await send('Page.navigate',{url:origin})
  async function evaluate(expression) {
    const response=await send('Runtime.evaluate',{expression:expression.includes('await ') ? `(async()=>(${expression}))()` : expression,returnByValue:true,awaitPromise:true})
    if(response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  async function until(expression) {
    for(let i=0;i<100;i++) { if(await evaluate(expression)) return; await sleep(100) }
    throw new Error(`Browser condition timed out: ${expression}`)
  }
  await until('!!window.__multiAreaTestMap?.getLayer("canonical-areas-point")')
  await until('window.__multiAreaTestMap.isSourceLoaded("canonical-areas")')
  await until(`window.__multiAreaTestMap.queryRenderedFeatures({layers:['canonical-areas-fill','canonical-areas-line','canonical-areas-point']}).length > 0`)
  const featureState=await evaluate(`({ features:(await window.__multiAreaTestMap.getSource('canonical-areas').getData()).features.map(f=>({id:f.id,type:f.geometry.type})), canvas:!!document.querySelector('canvas') })`)
  assert.ok(featureState.canvas)
  assert.ok(new Set(featureState.features.map(f=>f.id)).size >= 5)
  console.log('PASS: real MapLibre initialises and loads five Area features across four geometry types.')
  await evaluate(`document.querySelector('.ex-games-find-me').click(); document.querySelector('.participant-search').value='Fixture Participant C'; document.querySelector('.participant-search').dispatchEvent(new Event('input',{bubbles:true}));`)
  assert.equal(await evaluate(`document.querySelectorAll('.participant-search-candidate').length`),1)
  await evaluate(`document.querySelector('.participant-search-candidate').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.participant-area').length`),3)
  await evaluate(`document.querySelector('[data-area-id="fixture-area-2"]').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.area-participant').length`),1)
  assert.equal(await evaluate(`document.querySelector('.area-participant').dataset.id`),'C')
  await evaluate(`document.querySelector('.area-participant').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.participant-area').length`),3)
  console.log('PASS: one search result -> three Areas -> same participant identity.')
  // Exercise actual geometry picking, including an Area with two participants.
  await evaluate(`window.__multiAreaTestMap.jumpTo({center:[174.735,-36.853],zoom:13}); document.querySelector('.ex-games-region-control').value='Auckland'; document.querySelector('.ex-games-region-control').dispatchEvent(new Event('change'));`)
  await sleep(400)
  await evaluate(`document.querySelector('.participant-panel').hidden=true`)
  const clickPoint = await evaluate(`window.__multiAreaTestMap.project([174.735,-36.853])`)
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...clickPoint,button:'left',clickCount:1})
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...clickPoint,button:'left',clickCount:1})
  await until(`document.querySelectorAll('.area-participant').length === 2`)
  assert.equal(await evaluate(`document.querySelectorAll('.area-participant').length`),2)
  console.log('PASS: selecting rendered MultiPolygon exposes both participants.')
  await evaluate(`document.querySelector('.ex-games-region-control').value='Northland Region';document.querySelector('.ex-games-region-control').dispatchEvent(new Event('change'));`)
  await sleep(200)
  const ids=await evaluate(`(await window.__multiAreaTestMap.getSource('canonical-areas').getData()).features.map(f=>f.id)`)
  assert.deepEqual(ids,['fixture-area-4'])
  await evaluate(`document.querySelector('.ex-games-find-me').click();document.querySelector('.participant-search').value='Fixture Participant C';document.querySelector('.participant-search').dispatchEvent(new Event('input',{bubbles:true}));`)
  assert.equal(await evaluate(`document.querySelectorAll('.participant-search-candidate').length`),1)
  console.log('PASS: regional view filters geography while returning participant C once.')
  await evaluate(`document.querySelector('.participant-search-candidate').click();document.querySelector('[data-area-id="fixture-area-4"]').click()`)
  await sleep(400)
  assert.deepEqual(errors,[])
  await fs.writeFile(path.join(cache,'multi-area-review.png'), Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  console.log('PASS: no uncaught browser exceptions. Screenshot: node_modules/.cache/multi-area-review.png')
  datasetMode = 'empty'
  await send('Page.reload',{ignoreCache:true})
  await until(`window.__multiAreaTestMap?.getSource('canonical-areas') && (await window.__multiAreaTestMap.getSource('canonical-areas').getData()).features.length === 0`)
  await evaluate(`document.querySelector('.ex-games-find-me').click();document.querySelector('.participant-search').value='The Forest Bridge Trust';document.querySelector('.participant-search').dispatchEvent(new Event('input',{bubbles:true}));`)
  assert.equal(await evaluate(`document.querySelectorAll('.participant-search-candidate').length`),1)
  await evaluate(`document.querySelector('.participant-search-candidate').click()`)
  assert.equal(await evaluate(`document.querySelector('[name="name"]').value`),'The Forest Bridge Trust')
  assert.equal(await evaluate(`document.querySelectorAll('.participant-area').length`),0)
  assert.ok(await evaluate(`['auckland-localities','dev-northland-authoritative-areas','living-map-areas','target-2050-candidates'].every(id=>!!window.__multiAreaTestMap.getSource(id))`))
  console.log('PASS: empty registry preserves existing sources and singular Forest Bridge Trust search/profile.')
  datasetMode = 'invalid'
  await send('Page.reload',{ignoreCache:true})
  await until(`document.querySelector('.area-validation-error')?.textContent.includes('Unknown participant ID')`)
  await until(`!!window.__multiAreaTestMap?.getLayer('canonical-areas-point')`)
  assert.equal(await evaluate(`(await window.__multiAreaTestMap.getSource('canonical-areas').getData()).features.length`),0)
  assert.deepEqual(errors,[])
  console.log('PASS: invalid relationships show a visible validation alert and produce no fabricated features.')
} finally {
  socket?.close()
  if(browser) { browser.kill(); await new Promise(resolve=>browser.once('exit',resolve)) }
  await server?.close()
  await fs.rm(profile,{recursive:true,force:true})
}
