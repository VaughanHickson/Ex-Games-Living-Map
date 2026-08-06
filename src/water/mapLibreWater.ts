import type { Map } from 'maplibre-gl'
import { renderWaterTile } from './renderer'

export const installLivingWater = (
  map: Map,
): void => {
  const size = 512

  const canvas =
    document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const context =
    canvas.getContext('2d')

  if (!context) {
    throw new Error(
      'Water canvas unavailable.',
    )
  }

  const layers = map.getStyle().layers.filter(
    (layer) =>
      layer.type === 'fill' &&
      /water|ocean|sea|lake|river/i.test(
        `${layer.id} ${
          'source-layer' in layer
            ? layer['source-layer']
            : ''
        }`,
      ),
  )

  const imageName = 'living-water'
  const startedAt = performance.now()

  const animate = (now: number): void => {
    renderWaterTile(
      context,
      size,
      size,
      ((now - startedAt) / 1000) * 1.12,
    )

    const image =
      context.getImageData(0, 0, size, size)

    if (map.hasImage(imageName)) {
      map.updateImage(imageName, image)
    } else {
      map.addImage(imageName, image)
    }

    for (const layer of layers) {
      map.setPaintProperty(
        layer.id,
        'fill-pattern',
        imageName,
      )
    }

    map.triggerRepaint()
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
