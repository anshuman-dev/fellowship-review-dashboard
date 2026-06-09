import { NextRequest, NextResponse } from "next/server";
import { getApplicant, updateApplicant } from "@/lib/storage";
import type { ReviewScores, Recommendation } from "@/lib/types";

function calcOverall(scores: Omit<ReviewScores, "overall">): number {
  return Math.round(
    scores.github.score * 3.5 +
    scores.papers.score * 3.5 +
    scores.linkedin.score * 1.5 +
    scores.consistency.score * 1.5,
  );
}

function calcRecommendation(overall: number): Recommendation {
  if (overall >= 80) return "strongly_recommend";
  if (overall >= 65) return "recommend";
  if (overall >= 45) return "borderline";
  return "do_not_recommend";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { scores, reviewerName } = body as {
    scores: Omit<ReviewScores, "overall">;
    reviewerName?: string;
  };

  const overall = calcOverall(scores);
  const recommendation = calcRecommendation(overall);

  const updated = updateApplicant(id, {
    review: {
      status: "completed",
      completedAt: new Date().toISOString(),
      scores: { ...scores, overall },
      recommendation,
      reviewerName,
    },
  });

  return NextResponse.json(updated);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(applicant);
}
