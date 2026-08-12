export const nzLocalitiesUrl =
  '/data/nz-suburbs-localities.geojson'

export const governedLocalityExceptions = {
  'Aotea / Great Barrier Island': {
    region: 'Auckland',
    reason:
      'Ecologically significant island place used by Ex Games research but not represented by LINZ as the required Auckland Suburb/Locality.',
  },
} as const

export const isGovernedLocalityException = (name: string) =>
  name in governedLocalityExceptions
