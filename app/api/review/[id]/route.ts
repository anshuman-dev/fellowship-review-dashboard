import { NextRequest, NextResponse } from "next/server";
import { getApplicant, updateApplicant } from "@/lib/storage";
import { runReview } from "@/lib/evaluator";

// Runs the full review synchronously and returns the result.
// Serverless-safe: no fire-and-forget — the function stays alive until review completes.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (applicant.review.status === "reviewing") {
    return NextResponse.json({ error: "Review already in progress" }, { status: 409 });
  }

  try {
    updateApplicant(id, { review: { status: "reviewing", startedAt: new Date().toISOString() } });
    const result = await runReview(applicant);
    const updated = updateApplicant(id, { review: result });
    return NextResponse.json(updated);
  } catch (err) {
    updateApplicant(id, { review: { status: "error", errorMessage: String(err) } });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = getApplicant(id);
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(applicant);
}
