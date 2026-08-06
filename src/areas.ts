export const firstLivingMapArea = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'area-auckland-central-001',
      properties: {
        areaId: 'AREA-AKL-CENTRAL-001',
        name: 'Auckland Central',
        areaType: 'Demonstration territory',
        territoryReference: 'Postcode 1010 prototype',
        boundaryStatus: 'Illustrative demonstration boundary',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [174.743, -36.865],
            [174.743, -36.838],
            [174.781, -36.838],
            [174.781, -36.865],
            [174.743, -36.865],
          ],
        ],
      },
    },
  ],
}
