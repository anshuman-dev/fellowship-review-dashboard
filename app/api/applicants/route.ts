import { NextResponse } from "next/server";
import { readApplicants } from "@/lib/storage";

export async function GET() {
  const applicants = await readApplicants();
  return NextResponse.json(applicants);
}
