export interface ApplicantLinks {
  github?: string;
  linkedin?: string;
  papers?: string[];
  blogPosts?: string[];
}

export interface DimensionScore {
  score: number; // 0-10, set by human reviewer
  notes?: string;
}

export interface ReviewScores {
  github: DimensionScore;      // weight 35%
  papers: DimensionScore;      // weight 35%
  linkedin: DimensionScore;    // weight 15%
  consistency: DimensionScore; // weight 15%
  overall: number;             // 0-100 weighted
}

export type Recommendation =
  | "strongly_recommend"
  | "recommend"
  | "borderline"
  | "do_not_recommend";

export type HumanDecision = "accepted" | "waitlisted" | "rejected" | null;

export interface ReviewResult {
  status: "pending" | "in_progress" | "completed";
  completedAt?: string;
  scores?: ReviewScores;
  recommendation?: Recommendation;
  reviewerName?: string;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  appliedTrack: string;
  statement: string;
  submittedAt: string;
  links: ApplicantLinks;
  review: ReviewResult;
  humanDecision: HumanDecision;
  humanNotes?: string;
}
