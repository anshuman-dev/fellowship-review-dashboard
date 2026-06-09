"use client";

import { useState } from "react";
import type { Applicant, HumanDecision, Recommendation, DimensionScore } from "@/lib/types";

const DIMENSIONS = [
  {
    key: "github" as const,
    label: "GitHub",
    weight: "35%",
    hint: "Open their GitHub and look for:",
    criteria: [
      "Repos directly related to AI Safety, alignment, or interpretability",
      "Original work — not just forks or starred repos",
      "Meaningful commits, not just README files",
      "Recent activity within the past 12 months",
    ],
    low: "No relevant repos",
    high: "Strong AI Safety portfolio",
  },
  {
    key: "papers" as const,
    label: "Papers & Posts",
    weight: "35%",
    hint: "Open their papers and blog posts and look for:",
    criteria: [
      "Published on AI Safety topics (arXiv, LessWrong, Alignment Forum)",
      "Technical depth — goes beyond surface-level commentary",
      "Author attribution clearly connects to this applicant",
      "Cited or engaged with by others in the field",
    ],
    low: "Nothing published",
    high: "Multiple quality, relevant works",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn / Profile",
    weight: "15%",
    hint: "Open their LinkedIn and look for:",
    criteria: [
      "Academic or professional background in ML, CS, or adjacent field",
      "Experience at relevant orgs (labs, AI safety orgs, research roles)",
      "Profile narrative matches the track they applied for",
    ],
    low: "Unrelated background",
    high: "Highly aligned background",
  },
  {
    key: "consistency" as const,
    label: "Consistency",
    weight: "15%",
    hint: "Cross-check all links and look for:",
    criteria: [
      "Motivation statement matches their actual body of work",
      "All submitted links are genuinely theirs",
      "No red flags (e.g. claiming authorship of others' work)",
      "Links reinforce a coherent research identity",
    ],
    low: "Major red flags",
    high: "Everything checks out",
  },
];

const REC_CONFIG: Record<Recommendation, { label: string; bg: string; border: string; text: string; badge: string }> = {
  strongly_recommend: { label: "Strongly Recommend", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-800" },
  recommend:          { label: "Recommend",           bg: "bg-green-50",   border: "border-green-200",   text: "text-green-700",  badge: "bg-green-100 text-green-800" },
  borderline:         { label: "Borderline",          bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",  badge: "bg-amber-100 text-amber-800" },
  do_not_recommend:   { label: "Do Not Recommend",    bg: "bg-red-50",     border: "border-red-200",     text: "text-red-800",    badge: "bg-red-100 text-red-800" },
};

function calcOverall(scores: Record<string, DimensionScore>): number {
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

function ScoreSlider({
  dim,
  value,
  notes,
  onChange,
}: {
  dim: typeof DIMENSIONS[number];
  value: number;
  notes: string;
  onChange: (score: number, notes: string) => void;
}) {
  const color = value >= 7 ? "text-emerald-600" : value >= 5 ? "text-amber-600" : value > 0 ? "text-red-500" : "text-gray-300";
  const trackColor = value >= 7 ? "bg-emerald-500" : value >= 5 ? "bg-amber-500" : value > 0 ? "bg-red-400" : "bg-gray-200";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{dim.label}</span>
            <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{dim.weight}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{dim.hint}</p>
        </div>
        <span className={`text-3xl font-bold tabular-nums ${color}`}>{value}</span>
      </div>

      {/* Criteria checklist */}
      <ul className="mb-4 space-y-1">
        {dim.criteria.map((c, i) => (
          <li key={i} className="text-xs text-gray-500 flex gap-2">
            <span className="text-gray-300 shrink-0 mt-0.5">·</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>

      {/* Slider */}
      <div className="mb-2">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value), notes)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${value >= 7 ? "#10b981" : value >= 5 ? "#f59e0b" : value > 0 ? "#f87171" : "#e5e7eb"} ${value * 10}%, #e5e7eb ${value * 10}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>0 — {dim.low}</span>
          <span>{dim.high} — 10</span>
        </div>
      </div>

      {/* Notes */}
      <input
        type="text"
        value={notes}
        onChange={(e) => onChange(value, e.target.value)}
        placeholder="Notes (optional)…"
        className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 bg-gray-50"
      />
    </div>
  );
}

export default function ReviewClient({ initial }: { initial: Applicant }) {
  const [applicant, setApplicant] = useState(initial);
  const [reviewerName, setReviewerName] = useState(initial.review.reviewerName || "");
  const [scores, setScores] = useState<Record<string, DimensionScore>>(
    initial.review.scores
      ? {
          github: initial.review.scores.github,
          papers: initial.review.scores.papers,
          linkedin: initial.review.scores.linkedin,
          consistency: initial.review.scores.consistency,
        }
      : { github: { score: 0 }, papers: { score: 0 }, linkedin: { score: 0 }, consistency: { score: 0 } }
  );
  const [saving, setSaving] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState(initial.humanNotes || "");

  const overall = calcOverall(scores);
  const recommendation = calcRecommendation(overall);
  const recCfg = REC_CONFIG[recommendation];
  const allScored = Object.values(scores).some((s) => s.score > 0);

  function updateScore(key: string, score: number, notes: string) {
    setScores((prev) => ({ ...prev, [key]: { score, notes: notes || undefined } }));
  }

  async function saveReview() {
    setSaving(true);
    const res = await fetch(`/api/review/${applicant.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores, reviewerName }),
    });
    if (res.ok) setApplicant(await res.json());
    setSaving(false);
  }

  async function submitDecision(decision: HumanDecision) {
    setSaving(true);
    const res = await fetch(`/api/decision/${applicant.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes: decisionNotes }),
    });
    if (res.ok) setApplicant((await res.json()).applicant);
    setSaving(false);
  }

  const { links } = applicant;

  return (
    <div className="space-y-6">

      {/* Application card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Application</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Track</div>
            <div className="text-sm font-medium text-gray-800">{applicant.appliedTrack}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Submitted</div>
            <div className="text-sm text-gray-700">
              {new Date(applicant.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">Motivation Statement</div>
          <p className="text-sm text-gray-700 leading-relaxed italic">"{applicant.statement}"</p>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-2">Open and review each link</div>
          <div className="flex flex-wrap gap-2">
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub ↗
              </a>
            )}
            {links.linkedin && (
              <a href={links.linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                LinkedIn ↗
              </a>
            )}
            {(links.papers || []).map((p, i) => (
              <a key={i} href={p} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-purple-50 border border-purple-100 rounded px-3 py-1.5 text-purple-700 hover:bg-purple-100 transition-colors font-medium">
                Paper {i + 1} ↗
              </a>
            ))}
            {(links.blogPosts || []).map((b, i) => (
              <a key={i} href={b} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-100 rounded px-3 py-1.5 text-orange-700 hover:bg-orange-100 transition-colors font-medium">
                Post {i + 1} ↗
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Live score summary */}
      {allScored && (
        <div className={`rounded-xl border p-4 ${recCfg.bg} ${recCfg.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${recCfg.badge}`}>
                {recCfg.label}
              </span>
              <p className={`mt-1.5 text-xs ${recCfg.text}`}>
                Based on current scores. Updates live as you adjust.
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold tabular-nums text-gray-800`}>{overall}</div>
              <div className="text-xs text-gray-400">/ 100</div>
            </div>
          </div>
        </div>
      )}

      {/* Scoring rubric */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Review Rubric — open each link then rate below
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {DIMENSIONS.map((dim) => (
            <ScoreSlider
              key={dim.key}
              dim={dim}
              value={scores[dim.key].score}
              notes={scores[dim.key].notes || ""}
              onChange={(score, notes) => updateScore(dim.key, score, notes)}
            />
          ))}
        </div>
      </div>

      {/* Save review */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1.5 block">Your name</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Reviewer name…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            onClick={saveReview}
            disabled={saving || !allScored}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save Review"}
          </button>
        </div>
        {applicant.review.status === "completed" && applicant.review.completedAt && (
          <p className="text-xs text-gray-400 mt-2">
            Last saved {new Date(applicant.review.completedAt).toLocaleTimeString()}
            {applicant.review.reviewerName && ` by ${applicant.review.reviewerName}`}
          </p>
        )}
      </div>

      {/* Final decision */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Final Decision</h2>
        <p className="text-xs text-gray-400 mb-4">Your call — the rubric score is a guide, not a verdict</p>

        {applicant.humanDecision && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            Current: <span className="font-semibold capitalize">{applicant.humanDecision}</span>
            {applicant.humanNotes && <span className="text-gray-400 ml-2">· "{applicant.humanNotes}"</span>}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Notes for the team</label>
          <textarea
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder="Add context for the team…"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => submitDecision("accepted")} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Accept
          </button>
          <button onClick={() => submitDecision("waitlisted")} disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
            Waitlist
          </button>
          <button onClick={() => submitDecision("rejected")} disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
