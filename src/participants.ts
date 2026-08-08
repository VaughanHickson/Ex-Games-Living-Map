export interface Participant {
  id: string
  name: string
  locality: string
  type: string
  summary: string
  activities: readonly string[]
  relationship: string
  website?: string
  detail?: string
  profileClaimed: boolean
}

export const riverheadParticipants: readonly Participant[] = [
  {
    id: 'forest-bridge-trust',
    name: 'The Forest Bridge Trust',
    locality: 'Riverhead',
    profileClaimed: false,
    type: 'Conservation organisation',
    summary: 'Landscape-scale biodiversity and community conservation.',
    activities: ['Predator control', 'Biodiversity', 'Species monitoring', 'Community'],
    relationship:
      'Connected to Riverhead through conservation activity around Riverhead Forest.',
    website: 'https://www.theforestbridgetrust.org.nz/',
    detail:
      'Supports predator control, ecological monitoring, restoration and community conservation across northern Auckland.',
  },
  {
    id: 'riverhead-school',
    name: 'Riverhead School',
    locality: 'Riverhead',
    profileClaimed: false,
    type: 'School',
    summary: 'Local Year 0–8 learning community.',
    activities: ['Education', 'Young people', 'Community'],
    relationship: 'A directly local Riverhead institution.',
    website: 'https://www.riverhead.school.nz/',
  },
  {
    id: 'riverhead-community-association',
    name: 'Riverhead Community Association',
    locality: 'Riverhead',
    profileClaimed: false,
    type: 'Community organisation',
    summary: 'Local community voice and connection.',
    activities: ['Community', 'Local issues', 'Connection'],
    relationship:
      'Connects people around issues affecting the Riverhead community.',
  },
  {
    id: 'the-riverhead',
    name: 'The Riverhead',
    locality: 'Riverhead',
    profileClaimed: false,
    type: 'Local business',
    summary: 'Historic hospitality and community venue.',
    activities: ['Business', 'Hospitality', 'Community'],
    relationship:
      'A longstanding Riverhead gathering place.',
    website: 'https://www.theriverhead.co.nz/',
  },
]
