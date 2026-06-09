import type { FetchedContent } from "./fetchers";
import type { DimensionScore, ReviewScores, Recommendation } from "./types";

// ─── AI Safety keyword taxonomy ───────────────────────────────────────────────

const SAFETY_CORE = [
  "alignment", "ai safety", "ai-safety", "aisafety",
  "interpretability", "mechanistic interpretability",
  "scalable oversight", "corrigibility", "value learning",
  "inner alignment", "outer alignment", "mesa-optimizer",
  "deceptive alignment", "reward hacking", "reward misspecification",
  "eliciting latent knowledge", "elk",
  "superposition", "polysemanticity", "circuits", "features",
  "activation patching", "causal tracing", "attention head",
  "sparse autoencoder", "sae", "steering vector",
  "constitutional ai", "cai", "rlhf", "rlaif",
  "debate", "amplification", "iterated distillation",
  "robustness", "adversarial", "red teaming", "red-teaming",
  "sycophancy", "myopic", "truthful", "honest",
  "anthropic", "miri", "arc evals", "arc alignment",
  "redwood research", "conjecture", "apart research",
];

const SAFETY_ADJACENT = [
  "transformer", "language model", "llm", "gpt", "bert",
  "reinforcement learning", "rl", "neural network", "deep learning",
  "machine learning", "nlp", "computer vision",
  "fairness", "bias", "ethics", "governance",
];

function countKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw)).length;
}

function monthsAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30);
}

// ─── GitHub scorer ─────────────────────────────────────────────────────────────

export function scoreGitHub(fetched: FetchedContent | null): DimensionScore & { findings: string[] } {
  if (!fetched?.success || !fetched.meta?.repos) {
    return {
      score: 0,
      notes: fetched?.error || "Could not fetch GitHub profile",
      findings: [`GitHub fetch failed: ${fetched?.error || "unknown"}`],
    };
  }

  const repos = (fetched.meta.repos as unknown) as Array<{
    name: string; description: string; topics: string[]; stars: number;
    fork: boolean; updatedAt: string; language: string;
  }>;

  let points = 0;
  const findings: string[] = [];
  const ownRepos = repos.filter((r) => !r.fork);
  const recentCutoff = 12; // months

  for (const r of ownRepos.slice(0, 10)) {
    const allText = `${r.name} ${r.description} ${r.topics.join(" ")}`;
    const coreHits = countKeywords(allText, SAFETY_CORE);
    const adjHits = countKeywords(allText, SAFETY_ADJACENT);
    const isRecent = monthsAgo(r.updatedAt) <= recentCutoff;

    if (coreHits > 0) {
      points += 2;
      findings.push(`"${r.name}" — directly AI Safety-related (matched: ${SAFETY_CORE.filter(k => allText.toLowerCase().includes(k)).slice(0,3).join(", ")})`);
    } else if (adjHits > 0) {
      points += 0.5;
    }
    if (coreHits > 0 && r.stars > 10) { points += 0.5; findings.push(`"${r.name}" has ${r.stars} stars`); }
    if (coreHits > 0 && isRecent) { points += 0.5; }
  }

  // Bio/profile match
  const bioText = `${fetched.meta.bio || ""} ${fetched.meta.company || ""}`;
  if (countKeywords(bioText, SAFETY_CORE) > 0) {
    points += 1;
    findings.push(`GitHub bio/company mentions AI Safety-relevant terms`);
  }

  if (ownRepos.length === 0) findings.push("No original repos found (all forks or empty)");
  if (points === 0) findings.push("No AI Safety-related repos detected");

  const score = Math.min(10, Math.round(points));
  return { score, findings };
}

// ─── Papers & blog posts scorer ───────────────────────────────────────────────

export function scorePapers(fetched: Array<FetchedContent | null>): DimensionScore & { findings: string[] } {
  const successful = fetched.filter((f) => f?.success && f.content.length > 50) as FetchedContent[];

  if (successful.length === 0) {
    return { score: 0, findings: ["No papers or posts could be fetched"] };
  }

  let points = 0;
  const findings: string[] = [];

  for (const f of successful) {
    const text = `${f.title || ""} ${f.content}`;
    const coreHits = countKeywords(text, SAFETY_CORE);
    const adjHits = countKeywords(text, SAFETY_ADJACENT);

    if (f.url.includes("arxiv.org")) {
      const cats = (f.meta.categories as string[]) || [];
      const safetyCategories = cats.filter((c) => ["cs.AI", "cs.LG", "cs.CL", "stat.ML"].includes(c));
      if (coreHits >= 3) {
        points += 3;
        findings.push(`arXiv paper "${f.title}" — strong AI Safety content (${coreHits} keyword hits)`);
      } else if (coreHits > 0 || safetyCategories.length > 0) {
        points += 1.5;
        findings.push(`arXiv paper "${f.title}" — adjacent ML work (cats: ${safetyCategories.join(", ") || "other"})`);
      } else {
        findings.push(`arXiv paper "${f.title}" — not clearly AI Safety-related`);
      }
    } else if (f.url.includes("lesswrong") || f.url.includes("alignmentforum")) {
      if (coreHits >= 2) {
        points += 3;
        findings.push(`LessWrong/AF post "${f.title}" — directly on AI Safety`);
      } else {
        points += 1;
        findings.push(`LessWrong/AF post "${f.title}" — present but limited AI Safety depth`);
      }
    } else {
      if (coreHits >= 2) {
        points += 2;
        findings.push(`Blog post "${f.title}" — relevant AI Safety content`);
      } else if (adjHits > 0) {
        points += 0.5;
        findings.push(`Blog post "${f.title}" — general ML content, limited safety focus`);
      } else {
        findings.push(`Post "${f.title}" — not AI Safety-related`);
      }
    }
  }

  const score = Math.min(10, Math.round(points));
  return { score, findings };
}

// ─── LinkedIn / profile scorer ────────────────────────────────────────────────

export function scoreLinkedIn(fetched: FetchedContent | null): DimensionScore & { findings: string[] } {
  if (!fetched?.success || fetched.content.length < 100) {
    return {
      score: 0,
      findings: [fetched?.error === "HTTP 999" || fetched?.error?.includes("999")
        ? "LinkedIn blocked automated access (expected — reviewer should check manually)"
        : `LinkedIn fetch failed: ${fetched?.error || "no content"}`],
    };
  }

  const text = fetched.content;
  let points = 0;
  const findings: string[] = [];

  const RESEARCH_ORGS = ["deepmind", "openai", "anthropic", "google brain", "google deepmind", "miri",
    "redwood research", "arc alignment", "arc evals", "conjecture", "apart research",
    "university", "phd", "research scientist", "research engineer", "ml engineer",
    "mit", "stanford", "oxford", "cambridge", "carnegie mellon", "cmu", "berkeley", "eth"];

  const coreHits = countKeywords(text, SAFETY_CORE);
  const orgHits = countKeywords(text.toLowerCase(), RESEARCH_ORGS);

  if (coreHits >= 2) { points += 4; findings.push(`Profile explicitly mentions AI Safety topics (${coreHits} hits)`); }
  else if (coreHits > 0) { points += 2; findings.push("Profile mentions AI Safety-adjacent topics"); }

  if (orgHits >= 2) { points += 3; findings.push(`Relevant research orgs/institutions found in profile`); }
  else if (orgHits > 0) { points += 1.5; findings.push("Some relevant background found"); }

  if (points === 0) findings.push("No relevant AI Safety or research background detected in public profile");

  return { score: Math.min(10, Math.round(points)), findings };
}

// ─── Consistency scorer ───────────────────────────────────────────────────────

export function scoreConsistency(
  statement: string,
  appliedTrack: string,
  githubResult: ReturnType<typeof scoreGitHub>,
  papersResult: ReturnType<typeof scorePapers>,
): DimensionScore & { findings: string[] } {
  let points = 0;
  const findings: string[] = [];

  // Both GitHub and papers show AI Safety work
  if (githubResult.score >= 5 && papersResult.score >= 5) {
    points += 4;
    findings.push("GitHub and published work both demonstrate AI Safety focus — coherent profile");
  } else if (githubResult.score >= 3 || papersResult.score >= 3) {
    points += 2;
    findings.push("Partial evidence — one dimension shows AI Safety work, other is weak");
  } else {
    findings.push("Neither GitHub nor papers demonstrate clear AI Safety work");
  }

  // Statement mentions the applied track
  const trackKeywords: Record<string, string[]> = {
    "Mechanistic Interpretability": ["interpretability", "circuits", "features", "superposition", "mechanistic"],
    "Scalable Oversight": ["oversight", "debate", "amplification", "evaluation", "scalable"],
    "Robustness & Red-teaming": ["robustness", "red team", "adversarial", "attack", "jailbreak"],
  };
  const trackTerms = Object.entries(trackKeywords).find(([k]) =>
    appliedTrack.toLowerCase().includes(k.toLowerCase()))?.[1] || SAFETY_CORE;

  const stmtHits = countKeywords(statement, trackTerms);
  if (stmtHits >= 2) {
    points += 3;
    findings.push(`Motivation statement aligns with ${appliedTrack} track`);
  } else if (stmtHits > 0) {
    points += 1.5;
    findings.push("Statement partially aligns with applied track");
  } else {
    findings.push(`Statement doesn't clearly reference ${appliedTrack} concepts`);
  }

  // Prior work matches statement claims
  if (githubResult.score >= 4 && stmtHits > 0) {
    points += 2;
    findings.push("GitHub work substantiates what the statement claims");
  }

  return { score: Math.min(10, Math.round(points)), findings };
}

// ─── Weighted aggregation ──────────────────────────────────────────────────────

export function calcOverall(scores: Omit<ReviewScores, "overall">): number {
  return Math.round(
    scores.github.score * 3.5 +
    scores.papers.score * 3.5 +
    scores.linkedin.score * 1.5 +
    scores.consistency.score * 1.5,
  );
}

export function calcRecommendation(overall: number): Recommendation {
  if (overall >= 80) return "strongly_recommend";
  if (overall >= 65) return "recommend";
  if (overall >= 45) return "borderline";
  return "do_not_recommend";
}
