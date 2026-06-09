export interface ApplicantLinks {
  github?: string
  linkedin?: string
  papers?: string[]
  blogPosts?: string[]
}

export interface DimensionScore {
  score: number       // 0–10
  findings: string[]
}

export interface ReviewScores {
  github: DimensionScore
  papers: DimensionScore
  linkedin: DimensionScore
  consistency: DimensionScore
  overall: number     // 0–100 weighted
}

export type Recommendation = 'strongly_recommend' | 'recommend' | 'borderline' | 'do_not_recommend'
export type HumanDecision  = 'accepted' | 'waitlisted' | 'rejected' | null

export interface ReviewResult {
  status: 'pending' | 'running' | 'done'
  scores?: ReviewScores
  recommendation?: Recommendation
  ranAt?: string
}

export interface Applicant {
  id: string
  name: string
  email: string
  appliedTrack: string
  statement: string
  submittedAt: string
  links: ApplicantLinks
  review: ReviewResult
  decision: HumanDecision
  decisionNotes?: string
}
