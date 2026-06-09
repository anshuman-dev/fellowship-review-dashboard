import { NextRequest, NextResponse } from "next/server";
import { getApplicant, updateApplicant } from "@/lib/storage";
import { fetchGitHub, fetchLink } from "@/lib/fetchers";
import { scoreGitHub, scorePapers, scoreLinkedIn, scoreConsistency, calcOverall, calcRecommendation } from "@/lib/scorer";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = await getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await updateApplicant(id, { review: { status: "in_progress" } });

    const { links, statement, appliedTrack } = applicant;

    const [githubFetched, linkedinFetched, ...restFetched] = await Promise.all([
      links.github ? fetchGitHub(links.github) : Promise.resolve(null),
      links.linkedin ? fetchLink(links.linkedin) : Promise.resolve(null),
      ...(links.papers || []).map((u) => fetchLink(u)),
      ...(links.blogPosts || []).map((u) => fetchLink(u)),
    ]);

    const githubScore = scoreGitHub(githubFetched);
    const papersScore = scorePapers(restFetched);
    const linkedinScore = scoreLinkedIn(linkedinFetched);
    const consistencyScore = scoreConsistency(statement, appliedTrack, githubScore, papersScore);

    const scores = { github: githubScore, papers: papersScore, linkedin: linkedinScore, consistency: consistencyScore };
    const overall = calcOverall(scores);
    const recommendation = calcRecommendation(overall);

    const updated = await updateApplicant(id, {
      review: { status: "completed", completedAt: new Date().toISOString(), scores: { ...scores, overall }, recommendation },
    });

    return NextResponse.json(updated);
  } catch (err) {
    await updateApplicant(id, { review: { status: "pending" } });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = await getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(applicant);
}
