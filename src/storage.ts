import type { Applicant } from './types'
import { DEFAULT_APPLICANTS } from './data/applicants'

const KEY = 'fellowship-review-v1'

export function loadApplicants(): Applicant[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  saveApplicants(DEFAULT_APPLICANTS)
  return DEFAULT_APPLICANTS
}

export function saveApplicants(applicants: Applicant[]): void {
  localStorage.setItem(KEY, JSON.stringify(applicants))
}

export function updateApplicant(id: string, patch: Partial<Applicant>): Applicant[] {
  const all = loadApplicants()
  const idx = all.findIndex(a => a.id === id)
  if (idx === -1) return all
  all[idx] = { ...all[idx], ...patch }
  saveApplicants(all)
  return all
}
