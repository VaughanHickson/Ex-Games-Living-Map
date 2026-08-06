import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'

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
