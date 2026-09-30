import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier + '.ts', context.parentURL)
    if (fs.existsSync(fileURLToPath(url))) return next(url.href, context)
  }
  return next(specifier, context)
} })
const { buildRegionBounds, fitSelectedRegion } = await import('../src/region-viewport.ts')
const { nzRegions } = await import('../src/regions.ts')
const data = JSON.parse(fs.readFileSync('public/data/nz-regions.geojson'))
const bounds = buildRegionBounds(data)
const stub = (width, reduced = false) => {
  const calls = []
  globalThis.window = { matchMedia: () => ({ matches: reduced }) }
  return { calls, getContainer: () => ({ clientWidth: width }), fitBounds: (...args) => calls.push(args) }
}

test('every selectable region uses the complete canonical polygon extent', () => {
  assert.equal(bounds.size, nzRegions.length)
  for (const [,name] of nzRegions) {
    const coordinates = data.features.filter(f => f.properties.REGC2025_V1_00_NAME === name)
      .flatMap(f => f.geometry.coordinates.flat(f.geometry.type === 'Polygon' ? 1 : 2))
    const xs = coordinates.map(p => p[0]), ys = coordinates.map(p => p[1])
    assert.deepEqual(bounds.get(name), [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]])
    const map = stub(1440)
    fitSelectedRegion(map, name, bounds)
    assert.deepEqual(map.calls[0][0], bounds.get(name))
  }
})
test('desktop and mobile framing pad for controls without carrying regional padding forward', () => {
  for (const width of [390, 1440]) {
    const map = stub(width)
    fitSelectedRegion(map, "Hawke's Bay Region", bounds)
    const [,options] = map.calls[0]
    assert.ok(options.padding.top >= 96)
    assert.ok(options.padding.left * 2 < width / 2)
    assert.equal(options.bearing, 0)
    assert.equal(options.pitch, 0)
    assert.equal(options.duration, 700)
  }
})
test('national selection restores accepted NZ-wide framing after any region; reduced motion is respected', () => {
  const map = stub(390, true)
  fitSelectedRegion(map, 'Nelson Region', bounds)
  assert.equal(map.calls[0][1].duration, 0)
  fitSelectedRegion(map, '', bounds)
  assert.deepEqual(map.calls[1][0], [[166,-47.8],[179.5,-34.2]])
  assert.equal(map.calls[1][1].duration, 0)
  assert.equal(map.calls[1][1].padding, 24)
})
test('multipart regional features contribute all extents; unknown regions do not invent a camera', () => {
  const name='Test Region'
  const features=[
    {type:'Feature',properties:{REGC2025_V1_00_NAME:name},geometry:{type:'MultiPolygon',coordinates:[[[[170,-40],[171,-41],[170,-40]]]],}},
    {type:'Feature',properties:{REGC2025_V1_00_NAME:name},geometry:{type:'Polygon',coordinates:[[[172,-42],[173,-43],[172,-42]]]}},
  ]
  assert.deepEqual(buildRegionBounds({type:'FeatureCollection',features}).get(name),[[170,-43],[173,-40]])
  const map=stub(390)
  fitSelectedRegion(map,'Unknown',bounds)
  assert.deepEqual(map.calls,[])
})
