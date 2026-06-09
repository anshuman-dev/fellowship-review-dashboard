import fs from "fs";
import path from "path";
import type { Applicant } from "./types";

const SOURCE_PATH = path.join(process.cwd(), "data", "applicants.json");
const BLOB_KEY = "applicants";

function isNetlify() {
  return !!process.env.NETLIFY;
}

async function getBlobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore("fellowship");
}

export async function readApplicants(): Promise<Applicant[]> {
  if (isNetlify()) {
    const store = await getBlobStore();
    const data = await store.get(BLOB_KEY, { type: "text" });
    if (!data) {
      // First deploy — seed from the bundled source file
      const initial: Applicant[] = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf-8"));
      await store.set(BLOB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  }
  return JSON.parse(fs.readFileSync(SOURCE_PATH, "utf-8"));
}

export async function writeApplicants(applicants: Applicant[]): Promise<void> {
  if (isNetlify()) {
    const store = await getBlobStore();
    await store.set(BLOB_KEY, JSON.stringify(applicants));
    return;
  }
  fs.writeFileSync(SOURCE_PATH, JSON.stringify(applicants, null, 2));
}

export async function getApplicant(id: string): Promise<Applicant | undefined> {
  const all = await readApplicants();
  return all.find((a) => a.id === id);
}

export async function updateApplicant(id: string, patch: Partial<Applicant>): Promise<Applicant | null> {
  const applicants = await readApplicants();
  const idx = applicants.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  applicants[idx] = { ...applicants[idx], ...patch };
  await writeApplicants(applicants);
  return applicants[idx];
}
