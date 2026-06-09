import { NextRequest, NextResponse } from "next/server";
import { updateApplicant } from "@/lib/storage";
import type { HumanDecision } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { decision, notes } = body as { decision: HumanDecision; notes?: string };

  const updated = updateApplicant(id, { humanDecision: decision, humanNotes: notes });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, applicant: updated });
}
