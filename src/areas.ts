export const firstLivingMapArea = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'area-auckland-central-site-001',
      properties: {
        areaId: 'AREA-AKL-CENTRAL-SITE-001',
        name: 'Demonstration Site',
        areaType: 'SITE',
        regionName: 'Auckland Region',
        localityName: 'Auckland Central',
        hierarchyLabel:
          'Auckland Region → Auckland Central → Demonstration Site',
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
