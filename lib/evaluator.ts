import Anthropic from "@anthropic-ai/sdk";
import { fetchLink, fetchGitHubProfile } from "./fetchers";
import type { Applicant, ReviewResult, ReviewScores, DimensionScore, Recommendation } from "./types";

const client = new Anthropic();

const WEIGHTS = { github: 0.35, papers: 0.35, linkedin: 0.15, consistency: 0.15 };

const SYSTEM_PROMPT = `You are an expert reviewer for the Apart Research AI Safety Fellowship.
Your job is to evaluate fellowship applicants based on their publicly verifiable work.
The fellowship focuses on AI Safety research: mechanistic interpretability, scalable oversight,
robustness, alignment theory, and related technical safety work.

Key evaluation principles:
- Prioritize ACTUAL past work that cannot be faked (code commits, published papers, authored posts)
- Be skeptical of vague claims not backed by linked evidence
- A strong applicant shows genuine depth in AI Safety, not just general ML
- Check whether work is original/authored vs. just a fork or star
- With LLMs, anyone can write about AI Safety — look for technical specificity and track record
- Be honest and direct. A weak application should be scored weak.

Return ONLY valid JSON matching the schema provided. No markdown, no explanation outside the JSON.`;

async function scoreDimension(
  dimension: string,
  context: string,
  applicantName: string,
  appliedTrack: string,
): Promise<DimensionScore> {
  if (!context || context.trim().length < 20) {
    return {
      score: 0,
      reasoning: "No content could be fetched for this dimension.",
      findings: ["No accessible content found"],
      fetched: false,
    };
  }

  const prompt = `Evaluate this applicant's ${dimension} for the Apart Research AI Safety Fellowship.

Applicant: ${applicantName}
Applied Track: ${appliedTrack}

Fetched Content:
${context}

Return JSON with exactly this shape:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>",
  "findings": ["<specific finding 1>", "<specific finding 2>", "<specific finding 3>"]
}

Scoring guide for ${dimension}:
- 80-100: Strong, directly relevant AI Safety work with clear depth and originality
- 60-79: Relevant ML/CS work with some safety connection
- 40-59: Tangentially related or shallow engagement
- 20-39: Mostly irrelevant to AI Safety
- 0-19: No relevant work or content inaccessible`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(raw);
  return { ...parsed, fetched: true };
}

async function scoreConsistency(
  allContent: Record<string, string>,
  applicantName: string,
  statement: string,
  appliedTrack: string,
): Promise<DimensionScore> {
  const combined = Object.entries(allContent)
    .map(([k, v]) => `=== ${k} ===\n${v}`)
    .join("\n\n");

  if (combined.trim().length < 50) {
    return { score: 0, reasoning: "Insufficient data to assess consistency.", findings: ["Could not fetch enough content"], fetched: false };
  }

  const prompt = `Evaluate the CROSS-LINK CONSISTENCY of this applicant for the Apart Research AI Safety Fellowship.

Applicant: ${applicantName}
Applied Track: ${appliedTrack}
Motivation Statement: "${statement}"

All fetched content:
${combined.slice(0, 6000)}

Assess: Do the GitHub, papers, blog posts, and LinkedIn tell a coherent story?
Does the applicant's stated interest in "${appliedTrack}" match their actual body of work?
Are there red flags (e.g., claiming authorship of work that doesn't connect back to them)?

Return JSON:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentences>",
  "findings": ["<finding 1>", "<finding 2>", "<finding 3>"]
}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(raw);
  return { ...parsed, fetched: true };
}

async function generateSummary(
  applicantName: string,
  appliedTrack: string,
  statement: string,
  scores: ReviewScores,
): Promise<{ recommendation: Recommendation; summary: string; keyStrengths: string[]; concerns: string[] }> {
  const prompt = `Generate a final fellowship review summary for:

Applicant: ${applicantName}
Applied Track: ${appliedTrack}
Statement: "${statement}"

Dimension scores (0-100):
- GitHub Work: ${scores.github.score} — ${scores.github.reasoning}
- Papers/Blog Posts: ${scores.papers.score} — ${scores.papers.reasoning}
- LinkedIn Profile: ${scores.linkedin.score} — ${scores.linkedin.reasoning}
- Cross-link Consistency: ${scores.consistency.score} — ${scores.consistency.reasoning}
- Weighted Overall: ${scores.overall}

Return JSON:
{
  "recommendation": "<one of: strongly_recommend | recommend | borderline | do_not_recommend>",
  "summary": "<3-4 sentence overall assessment for the human reviewer>",
  "keyStrengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>", "<concern 2>"]
}

Recommendation thresholds:
- strongly_recommend: overall >= 75 AND strong evidence of AI Safety depth
- recommend: overall >= 58
- borderline: overall >= 40
- do_not_recommend: overall < 40`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  return JSON.parse(raw);
}

export async function runReview(applicant: Applicant): Promise<ReviewResult> {
  const { name, appliedTrack, statement, links } = applicant;
  const fetchedContent: Record<string, string> = {};

  // --- Fetch all content in parallel ---
  const [githubFetch, linkedinFetch, ...otherFetches] = await Promise.all([
    links.github ? fetchGitHubProfile(links.github) : Promise.resolve(null),
    links.linkedin ? fetchLink(links.linkedin) : Promise.resolve(null),
    ...((links.papers || []).map((u) => fetchLink(u))),
    ...((links.blogPosts || []).map((u) => fetchLink(u))),
  ]);

  if (githubFetch?.success) fetchedContent.github = githubFetch.content;
  if (linkedinFetch?.success) fetchedContent.linkedin = linkedinFetch.content;

  const paperAndBlogContent: string[] = [];
  for (const f of otherFetches) {
    if (f?.success && f.content) {
      paperAndBlogContent.push(`[${f.title || f.url}]\n${f.content}`);
      fetchedContent[f.url] = f.content;
    }
  }

  // --- Score each dimension in parallel ---
  const [githubScore, papersScore, linkedinScore] = await Promise.all([
    scoreDimension("GitHub repositories and profile", fetchedContent.github || "", name, appliedTrack),
    scoreDimension("research papers and blog posts", paperAndBlogContent.join("\n\n---\n\n"), name, appliedTrack),
    scoreDimension("LinkedIn profile", fetchedContent.linkedin || "", name, appliedTrack),
  ]);

  const consistencyScore = await scoreConsistency(fetchedContent, name, statement, appliedTrack);

  const overall = Math.round(
    githubScore.score * WEIGHTS.github +
    papersScore.score * WEIGHTS.papers +
    linkedinScore.score * WEIGHTS.linkedin +
    consistencyScore.score * WEIGHTS.consistency,
  );

  const scores: ReviewScores = {
    github: githubScore,
    papers: papersScore,
    linkedin: linkedinScore,
    consistency: consistencyScore,
    overall,
  };

  const { recommendation, summary, keyStrengths, concerns } = await generateSummary(name, appliedTrack, statement, scores);

  return {
    status: "completed",
    completedAt: new Date().toISOString(),
    scores,
    recommendation,
    summary,
    keyStrengths,
    concerns,
  };
}
