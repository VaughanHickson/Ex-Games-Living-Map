import type { FieldRegion } from './field'
import type { RgbColour } from './palette'

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value))

const smoothStep = (value: number): number => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

const mix = (
  first: RgbColour,
  second: RgbColour,
  amount: number,
): RgbColour => {
  const t = clamp01(amount)

  return {
    red: Math.round(first.red + (second.red - first.red) * t),
    green: Math.round(first.green + (second.green - first.green) * t),
    blue: Math.round(first.blue + (second.blue - first.blue) * t),
  }
}

const oceanBlue: RgbColour = {
  red: 31,
  green: 101,
  blue: 128,
}

const blueGreen: RgbColour = {
  red: 44,
  green: 137,
  blue: 128,
}

const livingGreen: RgbColour = {
  red: 88,
  green: 176,
  blue: 103,
}

const softSage: RgbColour = {
  red: 145,
  green: 200,
  blue: 166,
}

const mistWhite: RgbColour = {
  red: 231,
  green: 242,
  blue: 243,
}

const hashValue = (
  x: number,
  y: number,
  seed: number,
): number => {
  const value = Math.sin(
    x * 127.1 +
    y * 311.7 +
    seed * 74.7,
  ) * 43758.5453

  return value - Math.floor(value)
}

const fade = (value: number): number =>
  value * value * value *
  (value * (value * 6 - 15) + 10)

const interpolate = (
  first: number,
  second: number,
  amount: number,
): number =>
  first + (second - first) * amount

const smoothValueNoise = (
  x: number,
  y: number,
  seed: number,
): number => {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1

  const tx = fade(x - x0)
  const ty = fade(y - y0)

  const top = interpolate(
    hashValue(x0, y0, seed),
    hashValue(x1, y0, seed),
    tx,
  )
  const bottom = interpolate(
    hashValue(x0, y1, seed),
    hashValue(x1, y1, seed),
    tx,
  )

  return interpolate(top, bottom, ty)
}

const smoothPhase = (
  x: number,
  y: number,
  seed: number,
): number =>
  smoothValueNoise(x, y, seed) * Math.PI * 2

const continuousNoise = (
  x: number,
  y: number,
  time: number,
  seed: number,
): number => {
  const phaseA = smoothPhase(
    x * 7,
    y * 7,
    seed,
  )
  const phaseB = smoothPhase(
    x * 13,
    y * 13,
    seed + 3.7,
  )

  const broad =
    Math.sin(
      x * 38.0 +
      y * 21.0 +
      time * 0.33 +
      phaseA,
    ) * 0.30 +
    Math.cos(
      x * 24.0 -
      y * 43.0 -
      time * 0.25 +
      phaseB,
    ) * 0.25

  const medium =
    Math.sin(
      (x + y) * 71.0 +
      time * 0.20 +
      phaseB * 0.63,
    ) * 0.20 +
    Math.cos(
      (x - y) * 89.0 -
      time * 0.15 +
      phaseA * 0.71,
    ) * 0.15

  const fine =
    Math.sin(
      x * 157.0 +
      y * 131.0 +
      time * 0.11 +
      phaseA -
      phaseB,
    ) * 0.10

  return broad + medium + fine
}

const flowCoordinates = (
  x: number,
  y: number,
  elapsedSeconds: number,
): { x: number; y: number; localTime: number } => {
  const localPhase =
    x * 1.9 +
    y * 2.6 +
    Math.sin(x * 4.2 - y * 3.1) * 0.8

  const randomTimeOffset =
    smoothPhase(
      x * 9,
      y * 9,
      11.3,
    )

  const localTime =
    elapsedSeconds * 1.12 * (0.24 + x * 0.05 + y * 0.035) +
    localPhase +
    randomTimeOffset

  const flowX =
    Math.sin(y * 6.2 + localTime * 0.47) * 0.082 +
    Math.sin((x + y) * 10.4 - localTime * 0.30) * 0.041 +
    Math.cos((x - y) * 17.3 + localTime * 0.13) * 0.017

  const flowY =
    Math.cos(x * 6.9 - localTime * 0.41) * 0.070 +
    Math.sin((x - y) * 11.8 + localTime * 0.25) * 0.035 +
    Math.sin((x + y) * 19.1 - localTime * 0.15) * 0.015

  return {
    x: x + flowX,
    y: y + flowY,
    localTime,
  }
}

const sampleContinuousSurface = (
  background: RgbColour,
  x: number,
  y: number,
  elapsedSeconds: number,
): RgbColour => {
  const flow = flowCoordinates(x, y, elapsedSeconds)

  const broadBlue = continuousNoise(
    flow.x * 0.075,
    flow.y * 0.075,
    flow.localTime * 0.18,
    3.1,
  )

  const broadDepth = continuousNoise(
    flow.x * 0.11 + 2.4,
    flow.y * 0.09 - 1.7,
    flow.localTime * 0.13,
    6.8,
  )

  const mediumTeal = continuousNoise(
    flow.x * 0.24 - 3.2,
    flow.y * 0.28 + 4.1,
    flow.localTime * 0.31,
    11.7,
  )

  const mediumGreen = continuousNoise(
    flow.x * 0.33 + 7.4,
    flow.y * 0.30 - 5.6,
    flow.localTime * 0.27,
    19.4,
  )

  const fineLight = continuousNoise(
    x * 3.45 - 9.3,
    y * 3.30 + 8.8,
    flow.localTime * 2.60,
    31.6,
  )

  const microLight = continuousNoise(
    x * 7.20 + 13.1,
    y * 6.45 - 12.7,
    flow.localTime * 2.20,
    47.2,
  )

  let colour = mix(
    background,
    oceanBlue,
    smoothStep((broadBlue + 0.72) / 1.44) * 0.62,
  )

  colour = mix(
    colour,
    blueGreen,
    smoothStep((broadDepth + 0.54) / 1.30) * 0.34,
  )

  colour = mix(
    colour,
    blueGreen,
    smoothStep((mediumTeal + 0.42) / 1.22) * 0.22,
  )

  colour = mix(
    colour,
    livingGreen,
    smoothStep((mediumGreen - 0.05) / 0.95) * 0.12,
  )

  colour = mix(
    colour,
    softSage,
    smoothStep((mediumGreen - mediumTeal - 0.18) / 0.82) *
      0.07,
  )

  const lightCarrier =
    fineLight * 0.55 +
    microLight * 0.45

  const reflection =
    smoothStep((lightCarrier - 0.52) / 0.24) * 0.31

  return mix(colour, mistWhite, reflection)
}

let offscreen: HTMLCanvasElement | null = null
let offscreenContext: CanvasRenderingContext2D | null = null

const ensureOffscreen = (
  width: number,
  height: number,
): CanvasRenderingContext2D => {
  if (!offscreen) {
    offscreen = document.createElement('canvas')
  }

  if (
    offscreen.width !== width ||
    offscreen.height !== height
  ) {
    offscreen.width = width
    offscreen.height = height
    offscreenContext = offscreen.getContext('2d')
  }

  if (!offscreenContext) {
    throw new Error(
      'Living Field offscreen context is unavailable.',
    )
  }

  return offscreenContext
}

const createWaterMask = (
  width: number,
  height: number,
): {
  combined: Path2D
  coastlines: readonly Path2D[]
} => {
  const harbour = new Path2D()
  harbour.moveTo(width * 0.04, height * 0.24)
  harbour.bezierCurveTo(
    width * 0.13,
    height * 0.10,
    width * 0.30,
    height * 0.13,
    width * 0.40,
    height * 0.22,
  )
  harbour.bezierCurveTo(
    width * 0.48,
    height * 0.30,
    width * 0.53,
    height * 0.25,
    width * 0.62,
    height * 0.32,
  )
  harbour.bezierCurveTo(
    width * 0.70,
    height * 0.39,
    width * 0.65,
    height * 0.52,
    width * 0.53,
    height * 0.50,
  )
  harbour.bezierCurveTo(
    width * 0.42,
    height * 0.48,
    width * 0.34,
    height * 0.62,
    width * 0.22,
    height * 0.57,
  )
  harbour.bezierCurveTo(
    width * 0.10,
    height * 0.53,
    width * 0.01,
    height * 0.39,
    width * 0.04,
    height * 0.24,
  )
  harbour.closePath()

  const inlet = new Path2D()
  inlet.moveTo(width * 0.51, height * 0.48)
  inlet.bezierCurveTo(
    width * 0.59,
    height * 0.46,
    width * 0.65,
    height * 0.53,
    width * 0.72,
    height * 0.63,
  )
  inlet.bezierCurveTo(
    width * 0.79,
    height * 0.73,
    width * 0.88,
    height * 0.74,
    width * 0.96,
    height * 0.83,
  )
  inlet.lineTo(width * 0.92, height * 0.91)
  inlet.bezierCurveTo(
    width * 0.84,
    height * 0.84,
    width * 0.76,
    height * 0.82,
    width * 0.68,
    height * 0.72,
  )
  inlet.bezierCurveTo(
    width * 0.61,
    height * 0.63,
    width * 0.57,
    height * 0.57,
    width * 0.48,
    height * 0.56,
  )
  inlet.closePath()

  const estuary = new Path2D()
  estuary.moveTo(width * 0.70, height * 0.12)
  estuary.bezierCurveTo(
    width * 0.79,
    height * 0.06,
    width * 0.90,
    height * 0.10,
    width * 0.95,
    height * 0.20,
  )
  estuary.bezierCurveTo(
    width * 0.99,
    height * 0.30,
    width * 0.91,
    height * 0.38,
    width * 0.82,
    height * 0.34,
  )
  estuary.bezierCurveTo(
    width * 0.74,
    height * 0.31,
    width * 0.67,
    height * 0.23,
    width * 0.70,
    height * 0.12,
  )
  estuary.closePath()

  const lake = new Path2D()
  lake.ellipse(
    width * 0.20,
    height * 0.79,
    width * 0.075,
    height * 0.10,
    -0.28,
    0,
    Math.PI * 2,
  )

  const combined = new Path2D()
  combined.addPath(harbour)
  combined.addPath(inlet)
  combined.addPath(estuary)
  combined.addPath(lake)

  return {
    combined,
    coastlines: [harbour, inlet, estuary, lake],
  }
}

const drawMapContext = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  waterSurface: HTMLCanvasElement,
): void => {
  const mask = createWaterMask(width, height)

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#d8ddcf'
  context.fillRect(0, 0, width, height)

  context.save()
  context.clip(mask.combined)
  context.drawImage(waterSurface, 0, 0, width, height)
  context.restore()

  context.save()
  context.strokeStyle = '#4d5c52'
  context.lineWidth = Math.max(1.5, width / 720)
  context.globalAlpha = 0.82

  for (const coastline of mask.coastlines) {
    context.stroke(coastline)
  }

  context.restore()

  context.save()
  context.strokeStyle = '#c7a65d'
  context.lineWidth = Math.max(1.2, width / 900)
  context.globalAlpha = 0.72

  const roads = [
    [
      [0.08, 0.11],
      [0.22, 0.20],
      [0.34, 0.34],
      [0.50, 0.43],
      [0.66, 0.55],
      [0.86, 0.69],
    ],
    [
      [0.12, 0.64],
      [0.28, 0.58],
      [0.46, 0.62],
      [0.62, 0.70],
      [0.78, 0.88],
    ],
    [
      [0.56, 0.08],
      [0.60, 0.24],
      [0.58, 0.39],
      [0.66, 0.56],
      [0.74, 0.72],
    ],
  ] as const

  for (const road of roads) {
    context.beginPath()
    context.moveTo(
      road[0][0] * width,
      road[0][1] * height,
    )

    for (let index = 1; index < road.length; index += 1) {
      context.lineTo(
        road[index][0] * width,
        road[index][1] * height,
      )
    }

    context.stroke()
  }

  context.restore()

  context.save()
  context.fillStyle = '#27392f'
  context.font = `${Math.max(12, width / 70)}px system-ui, sans-serif`
  context.globalAlpha = 0.84

  const labels = [
    ['North Harbour', 0.19, 0.18],
    ['Central', 0.44, 0.40],
    ['East Estuary', 0.78, 0.16],
    ['South Inlet', 0.72, 0.71],
    ['Lake District', 0.10, 0.72],
  ] as const

  for (const [label, x, y] of labels) {
    context.fillText(label, x * width, y * height)
  }

  context.restore()
}

export const renderScene = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: RgbColour,
  _regions: readonly FieldRegion[],
  elapsedSeconds: number,
): void => {
  const renderWidth = Math.max(1, Math.floor(width / 3))
  const renderHeight = Math.max(1, Math.floor(height / 3))
  const bufferContext = ensureOffscreen(
    renderWidth,
    renderHeight,
  )

  const image = bufferContext.createImageData(
    renderWidth,
    renderHeight,
  )
  const data = image.data

  for (let pixelY = 0; pixelY < renderHeight; pixelY += 1) {
    const y = pixelY / Math.max(1, renderHeight - 1)

    for (let pixelX = 0; pixelX < renderWidth; pixelX += 1) {
      const x = pixelX / Math.max(1, renderWidth - 1)
      const colour = sampleContinuousSurface(
        background,
        x,
        y,
        elapsedSeconds,
      )
      const index = (pixelY * renderWidth + pixelX) * 4

      data[index] = colour.red
      data[index + 1] = colour.green
      data[index + 2] = colour.blue
      data[index + 3] = 255
    }
  }

  bufferContext.putImageData(image, 0, 0)

  drawMapContext(
    context,
    width,
    height,
    offscreen!,
  )
}

export const renderWaterTile = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSeconds: number,
): void => {
  const rw = Math.max(1, Math.floor(width / 3))
  const rh = Math.max(1, Math.floor(height / 3))
  const buffer = ensureOffscreen(rw, rh)
  const image = buffer.createImageData(rw, rh)

  for (let py = 0; py < rh; py += 1) {
    for (let px = 0; px < rw; px += 1) {
      const colour = sampleContinuousSurface(
        { red: 16, green: 78, blue: 110 },
        px / Math.max(1, rw - 1),
        py / Math.max(1, rh - 1),
        elapsedSeconds,
      )
      const i = (py * rw + px) * 4
      image.data.set([colour.red, colour.green, colour.blue, 255], i)
    }
  }

  buffer.putImageData(image, 0, 0)
  context.clearRect(0, 0, width, height)
  context.drawImage(offscreen!, 0, 0, width, height)
}
