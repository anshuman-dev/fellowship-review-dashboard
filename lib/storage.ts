import fs from "fs";
import path from "path";
import type { Applicant } from "./types";

const SOURCE_PATH = path.join(process.cwd(), "data", "applicants.json");
const TMP_PATH = "/tmp/applicants.json";

// On serverless, writes go to /tmp which persists within a warm container.
// Each function call resolves the live path so cold-start re-seeding works correctly.
function resolvedPath(): string {
  if (process.env.NODE_ENV !== "production") return SOURCE_PATH;
  if (!fs.existsSync(TMP_PATH)) {
    fs.copyFileSync(SOURCE_PATH, TMP_PATH);
  }
  return TMP_PATH;
}

export function readApplicants(): Applicant[] {
  const raw = fs.readFileSync(resolvedPath(), "utf-8");
  return JSON.parse(raw);
}

export function writeApplicants(applicants: Applicant[]): void {
  fs.writeFileSync(resolvedPath(), JSON.stringify(applicants, null, 2));
}

export function getApplicant(id: string): Applicant | undefined {
  return readApplicants().find((a) => a.id === id);
}

export function updateApplicant(id: string, patch: Partial<Applicant>): Applicant | null {
  const applicants = readApplicants();
  const idx = applicants.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  applicants[idx] = { ...applicants[idx], ...patch };
  writeApplicants(applicants);
  return applicants[idx];
}
