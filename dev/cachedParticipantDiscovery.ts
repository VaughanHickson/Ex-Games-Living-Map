import { readFile } from 'node:fs/promises'
import {
  participantsForLocality,
  type PotentialParticipant,
} from '../shared/participantDiscovery.ts'
import type {
  ParticipantDiscoveryAdapter,
} from '../shared/participantDiscoveryAdapter.ts'

export const cachedParticipantDiscovery:
  ParticipantDiscoveryAdapter = {
  async discover({ locality }) {
    const raw = await readFile(
      'public/data/potential-participants.json',
      'utf8',
    )
    const all = JSON.parse(raw) as PotentialParticipant[]
    return participantsForLocality(all, locality)
  },
}
