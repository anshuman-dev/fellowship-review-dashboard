"use client";

import { useState } from "react";
import type { Applicant, HumanDecision, Recommendation } from "@/lib/types";

function recommendationConfig(rec: Recommendation) {
  return {
    strongly_recommend: { label: "Strongly Recommend", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-800" },
    recommend: { label: "Recommend", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-800" },
    borderline: { label: "Borderline", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-800" },
    do_not_recommend: { label: "Do Not Recommend", bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-800" },
  }[rec];
}

function ScoreGauge({ score, label, reasoning, findings }: {
  score: number; label: string; reasoning: string; findings: string[];
}) {
  const [open, setOpen] = useState(false);
  const color = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const barColor = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{reasoning}</p>
      {findings.length > 0 && (
        <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800">
          {open ? "Hide findings ↑" : `${findings.length} findings ↓`}
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-1">
          {findings.map((f, i) => (
            <li key={i} className="text-xs text-gray-600 flex gap-1.5">
              <span className="text-gray-400 shrink-0">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReviewClient({ initial }: { initial: Applicant }) {
  const [applicant, setApplicant] = useState(initial);
  const [notes, setNotes] = useState(initial.humanNotes || "");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function startReview() {
    setReviewing(true);
    setApplicant((a) => ({ ...a, review: { status: "reviewing" } }));
    try {
      const res = await fetch(`/api/review/${applicant.id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setApplicant(data);
      } else {
        setApplicant((a) => ({ ...a, review: { status: "error", errorMessage: "Review failed" } }));
      }
    } catch {
      setApplicant((a) => ({ ...a, review: { status: "error", errorMessage: "Network error" } }));
    } finally {
      setReviewing(false);
    }
  }

  async function submitDecision(decision: HumanDecision) {
    setSaving(true);
    const res = await fetch(`/api/decision/${applicant.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplicant(data.applicant);
    }
    setSaving(false);
  }

  const { review, links } = applicant;
  const isDone = review.status === "completed";
  const recCfg = isDone && review.recommendation ? recommendationConfig(review.recommendation) : null;

  return (
    <div className="space-y-6">

      {/* Application summary */}
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
          <div className="text-xs text-gray-400 mb-2">Submitted Links</div>
          <div className="flex flex-wrap gap-2">
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-gray-700 hover:bg-gray-100 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
            )}
            {links.linkedin && (
              <a href={links.linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-blue-50 border border-blue-100 rounded px-2.5 py-1 text-blue-700 hover:bg-blue-100 transition-colors">
                LinkedIn
              </a>
            )}
            {(links.papers || []).map((p, i) => (
              <a key={i} href={p} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-purple-50 border border-purple-100 rounded px-2.5 py-1 text-purple-700 hover:bg-purple-100 transition-colors">
                Paper {i + 1}
              </a>
            ))}
            {(links.blogPosts || []).map((b, i) => (
              <a key={i} href={b} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-orange-50 border border-orange-100 rounded px-2.5 py-1 text-orange-700 hover:bg-orange-100 transition-colors">
                Post {i + 1}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* AI Review Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">AI Review</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automated analysis of verifiable work · Not a final decision</p>
          </div>
          {review.status === "pending" && (
            <button
              onClick={startReview}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Run AI Review
            </button>
          )}
          {reviewing && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Fetching and analysing links…
            </div>
          )}
        </div>

        {review.status === "error" && (
          <div className="px-6 py-4 bg-red-50 text-red-700 text-sm">
            Review failed: {review.errorMessage || "Unknown error"}
            <button onClick={startReview} className="ml-3 text-xs underline">Retry</button>
          </div>
        )}

        {reviewing && (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p>Fetching GitHub, papers, and posts…</p>
            <p className="text-xs mt-1">This takes 20–40 seconds</p>
          </div>
        )}

        {isDone && review.scores && review.recommendation && recCfg && (
          <div className="divide-y divide-gray-50">
            <div className={`px-6 py-4 ${recCfg.bg} border-b ${recCfg.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${recCfg.badge}`}>
                    {recCfg.label}
                  </span>
                  <p className={`mt-2 text-sm leading-relaxed ${recCfg.text}`}>{review.summary}</p>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <div className="text-4xl font-bold text-gray-800 tabular-nums">{review.scores.overall}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Overall score</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Key Strengths</div>
                <ul className="space-y-1">
                  {(review.keyStrengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-emerald-500 shrink-0">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">Concerns</div>
                <ul className="space-y-1">
                  {(review.concerns || []).map((c, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-red-400 shrink-0">−</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Dimension Breakdown</div>
              <div className="grid grid-cols-2 gap-3">
                <ScoreGauge score={review.scores.github.score} label="GitHub (35%)" reasoning={review.scores.github.reasoning} findings={review.scores.github.findings} />
                <ScoreGauge score={review.scores.papers.score} label="Papers & Posts (35%)" reasoning={review.scores.papers.reasoning} findings={review.scores.papers.findings} />
                <ScoreGauge score={review.scores.linkedin.score} label="LinkedIn (15%)" reasoning={review.scores.linkedin.reasoning} findings={review.scores.linkedin.findings} />
                <ScoreGauge score={review.scores.consistency.score} label="Consistency (15%)" reasoning={review.scores.consistency.reasoning} findings={review.scores.consistency.findings} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Human Decision */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Your Decision</h2>
        <p className="text-xs text-gray-400 mb-4">Final call is yours — AI recommendation is advisory only</p>

        {applicant.humanDecision && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            Current decision: <span className="font-semibold capitalize">{applicant.humanDecision}</span>
            {applicant.humanNotes && <div className="text-xs text-gray-500 mt-1">"{applicant.humanNotes}"</div>}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for the team…"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
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
