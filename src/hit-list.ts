export type HitListSectionKind = 'fauna' | 'flora' | 'other'
export type HitListEntryType = 'target_group' | 'species' | 'pest_class' | 'weed_group'
export type HitListTargetScope = 'national_target' | 'ecological_threat' | 'research_intelligence'
export type HitListPublicationStatus = 'verified' | 'candidate' | 'retired'

export interface HitListSource {
  label: string
  url: string
  authority: 'primary' | 'authoritative' | 'secondary' | 'participant'
  purpose?: string
}

export type HitListMediaRole =
  | 'subject' | 'identification' | 'sign'
  | 'impact' | 'comparison' | 'habitat'

export interface HitListMedia {
  role: HitListMediaRole
  url: string
  caption?: string
  credit?: string
  usageRights: string
  sourceUrl?: string
}

export interface HitListCommentary {
  id: string
  text: string
  supporterCount: number
  evidenceCount: number
  verificationStatus: 'unverified' | 'evidence_supported' | 'verified'
  localityIds?: string[]
}

export type KnowledgeStatus =
  | 'established'
  | 'needs_evidence'
  | 'open'
  | 'under_review'

export interface HitListKnowledgeComponent {
  key: string
  label: string
  status: KnowledgeStatus
  note?: string
}

export type HitListMissionMode =
  | 'collaborative'
  | 'versus'
  | 'intelligence_vs_field'

export type HitListMissionState =
  | 'candidate'
  | 'available'
  | 'active'
  | 'review'
  | 'completed'

export interface HitListMissionCandidate {
  id: string
  entryId: string
  knowledgeKey: string
  title: string
  mode: HitListMissionMode
  state: HitListMissionState
}

export interface HitListObservation {
  id: string
  observationType: 'sighting' | 'sign' | 'behaviour' | 'impact' | 'other'
  summary: string
  locality?: string
  observedAt?: string
  participantId?: string
  evidenceCount: number
  verificationStatus: 'unverified' | 'evidence_supported' | 'verified'
}

export interface HitListEntry {
  id: string
  sectionId: string
  parentId?: string | null
  name: string
  scientificName?: string | null
  aliases: string[]
  entryType: HitListEntryType
  targetScope: HitListTargetScope
  summary: string
  what: string
  where: string
  why: string
  corePurpose: {
    informationPage: boolean
    intelligenceGapMap: boolean
    onlineMissionSource: boolean
  }
  missionRelevance: string[]
  publicationStatus: HitListPublicationStatus
  verification: {
    status: 'verified' | 'pending' | 'rejected'
    verifiedAgainst: string[]
    reviewNote?: string
  }
  media: HitListMedia[]
  sources: HitListSource[]
  researchQuestions: string[]
  knowledgeComponents: HitListKnowledgeComponent[]
  intelligenceStatus:
    | 'not_required'
    | 'proposed'
    | 'investigating'
    | 'evidence_supported'
    | 'reviewed'
  discussionEnabled: boolean
  discussionTopicId?: string | null
  commentary: HitListCommentary[]
  fieldObservations: HitListObservation[]
  observationEnabled: boolean
  missionEligibility:
    | 'not_assessed'
    | 'research_only'
    | 'eligible'
    | 'not_eligible'
  suggestion: {
    submittedByParticipantId?: string | null
    submittedAt?: string | null
    verificationRequired: boolean
  }
}

export interface HitListData {
  schema: 'EXG-HIT-LIST-001'
  title: string
  principles: Record<string, boolean>
  sections: { id: string; label: string; kind: HitListSectionKind; description: string }[]
  entries: HitListEntry[]
}

export const childrenOf = (entries: HitListEntry[], parentId: string) =>
  entries.filter(entry => entry.parentId === parentId)

export const publishedHitList = (entries: HitListEntry[]) =>
  entries.filter(entry => entry.publicationStatus === 'verified' && entry.verification.status === 'verified')

export const knowledgeCompleteness = (entry: HitListEntry) => {
  const total = entry.knowledgeComponents.length
  if (!total) return 0
  const done = entry.knowledgeComponents.filter(
    component => component.status === 'established'
  ).length
  return Math.round((done / total) * 100)
}

export const openKnowledgeTasks = (entry: HitListEntry) =>
  entry.knowledgeComponents.filter(
    component => component.status !== 'established'
  )

export const deriveHitListMissionCandidates = (
  entry: HitListEntry
): HitListMissionCandidate[] =>
  openKnowledgeTasks(entry).map(component => ({
    id: `${entry.id}:${component.key}`,
    entryId: entry.id,
    knowledgeKey: component.key,
    title: `Complete ${component.label.toLowerCase()}`,
    mode: 'collaborative',
    state: 'candidate',
  }))
