import type { RgbColour } from './palette'

export type FieldRegion = {
  centreX: number
  centreY: number
  radiusX: number
  radiusY: number
  rotation: number
  strength: number
  colour: RgbColour
  priority: number
}

const smoothStep = (value: number): number => {
  const clamped = Math.min(1, Math.max(0, value))
  return clamped * clamped * (3 - 2 * clamped)
}

const boundaryNoise = (
  x: number,
  y: number,
  seed: number,
): number => {
  const broad =
    Math.sin(x * 11.3 + seed * 2.1) *
    Math.cos(y * 8.7 - seed * 1.7)

  const medium =
    Math.sin((x + y) * 19.1 + seed * 3.4) * 0.5

  const fine =
    Math.cos(x * 31.7 - y * 27.9 + seed * 4.8) * 0.25

  return broad * 0.55 + medium * 0.3 + fine * 0.15
}

const irregularDistance = (
  region: FieldRegion,
  x: number,
  y: number,
): number => {
  const dx = x - region.centreX
  const dy = y - region.centreY
  const cosine = Math.cos(region.rotation)
  const sine = Math.sin(region.rotation)

  const rotatedX = dx * cosine + dy * sine
  const rotatedY = -dx * sine + dy * cosine

  const ellipseDistance = Math.hypot(
    rotatedX / region.radiusX,
    rotatedY / region.radiusY,
  )

  const seed =
    region.centreX * 13.7 +
    region.centreY * 17.9 +
    region.priority * 5.3

  const irregularity =
    boundaryNoise(x, y, seed) * 0.22

  return ellipseDistance + irregularity
}

export const influenceAt = (
  region: FieldRegion,
  x: number,
  y: number,
): number => {
  const distance = irregularDistance(region, x, y)
  return smoothStep(1 - distance) * region.strength
}

const mix = (
  first: RgbColour,
  second: RgbColour,
  amount: number,
): RgbColour => {
  const t = Math.min(1, Math.max(0, amount))

  return {
    red: Math.round(first.red + (second.red - first.red) * t),
    green: Math.round(
      first.green + (second.green - first.green) * t,
    ),
    blue: Math.round(
      first.blue + (second.blue - first.blue) * t,
    ),
  }
}

export const sampleScene = (
  background: RgbColour,
  regions: readonly FieldRegion[],
  x: number,
  y: number,
): RgbColour => {
  const active = regions
    .map((region) => ({
      region,
      influence: influenceAt(region, x, y),
    }))
    .filter(({ influence }) => influence > 0)
    .sort((first, second) => {
      const firstScore =
        first.influence * first.region.priority
      const secondScore =
        second.influence * second.region.priority

      return secondScore - firstScore
    })

  if (active.length === 0) {
    return background
  }

  const primary = active[0]
  const primaryAmount = Math.min(
    0.92,
    primary.influence / (0.8 + primary.influence),
  )

  let colour = mix(
    background,
    primary.region.colour,
    primaryAmount,
  )

  for (
    let index = 1;
    index < Math.min(active.length, 4);
    index += 1
  ) {
    const secondary = active[index]
    const amount = Math.min(
      0.14,
      secondary.influence /
        (6 + secondary.influence),
    )

    colour = mix(
      colour,
      secondary.region.colour,
      amount,
    )
  }

  return colour
}
