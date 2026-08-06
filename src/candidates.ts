export const firstTarget2050Candidate = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'candidate-pest-free-south-auckland-001',
      properties: {
        candidateId: 'CANDIDATE-PFSA-001',
        name: 'Pest Free South Auckland',
        candidateType: 'ACTIVE_COMMUNITY_PROGRAMME',
        localityName: 'Manurewa',
        regionName: 'Auckland Region',
        leadOrganisation: 'Beautification Trust',
        status: 'Active',
        targetAlignment: 'Predator Free 2050',
        mission:
          'Community-led pest plant and predator control across South Auckland.',
        evidenceLabel: 'Beautification Trust — Pest Free South Auckland',
        evidenceUrl: 'https://www.beautification.org.nz/identify-pest-plants',
        currentEvidenceLabel: 'Beautification Trust — News and Stories',
        currentEvidenceUrl: 'https://www.beautification.org.nz/news-and-stories',
        positionStatus:
          'Representative locality position; not an operational boundary.',
        verifiedDate: '2026-08-06',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [174.887, -37.021],
      },
    },
  ],
}
