export interface ApplicantLinks {
  github?: string;
  linkedin?: string;
  papers?: string[];
  blogPosts?: string[];
}

export interface DimensionScore {
  score: number; // 0-100
  reasoning: string;
  findings: string[];
  fetched: boolean;
  error?: string;
}

export interface ReviewScores {
  github: DimensionScore;
  papers: DimensionScore;
  linkedin: DimensionScore;
  consistency: DimensionScore;
  overall: number; // weighted 0-100
}

export type Recommendation =
  | "strongly_recommend"
  | "recommend"
  | "borderline"
  | "do_not_recommend";

export type HumanDecision = "accepted" | "waitlisted" | "rejected" | null;

export interface ReviewResult {
  status: "pending" | "reviewing" | "completed" | "error";
  startedAt?: string;
  completedAt?: string;
  scores?: ReviewScores;
  recommendation?: Recommendation;
  summary?: string;
  keyStrengths?: string[];
  concerns?: string[];
  errorMessage?: string;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  appliedTrack: string;
  statement: string; // short motivation statement
  submittedAt: string;
  links: ApplicantLinks;
  review: ReviewResult;
  humanDecision: HumanDecision;
  humanNotes?: string;
}
