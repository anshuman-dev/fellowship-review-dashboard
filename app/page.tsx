import Link from "next/link";
import { readApplicants } from "@/lib/storage";
import type { Applicant, Recommendation, HumanDecision } from "@/lib/types";

function recommendationBadge(rec?: Recommendation) {
  if (!rec) return null;
  const config = {
    strongly_recommend: { label: "Strongly Recommend", cls: "bg-emerald-100 text-emerald-800" },
    recommend: { label: "Recommend", cls: "bg-green-100 text-green-800" },
    borderline: { label: "Borderline", cls: "bg-amber-100 text-amber-800" },
    do_not_recommend: { label: "Do Not Recommend", cls: "bg-red-100 text-red-800" },
  }[rec];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function humanDecisionBadge(dec: HumanDecision) {
  if (!dec) return null;
  const config = {
    accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-800" },
    waitlisted: { label: "Waitlisted", cls: "bg-purple-100 text-purple-800" },
    rejected: { label: "Rejected", cls: "bg-gray-100 text-gray-600" },
  }[dec];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function statusDot(status: Applicant["review"]["status"]) {
  const map: Record<string, { cls: string; label: string }> = {
    pending:     { cls: "bg-gray-300",                   label: "Pending" },
    in_progress: { cls: "bg-amber-400 animate-pulse",    label: "In Progress" },
    completed:   { cls: "bg-emerald-400",                label: "Done" },
  };
  const config = map[status] ?? { cls: "bg-gray-300", label: status };
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${config.cls}`} />
      {config.label}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-6 text-right text-gray-700 font-mono">{score}</span>
    </div>
  );
}

function getStats(applicants: Applicant[]) {
  const total = applicants.length;
  const reviewed = applicants.filter((a) => a.review.status === "completed").length;
  const accepted = applicants.filter((a) => a.humanDecision === "accepted").length;
  const awaitingDecision = applicants.filter((a) => a.humanDecision === null && a.review.status === "completed").length;
  return { total, reviewed, accepted, awaitingDecision };
}

export default function Dashboard() {
  const applicants = readApplicants();
  const s = getStats(applicants);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">Apart Research</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">Fellowship Review Dashboard</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Weighted rubric · Human decision is final</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.total}</div>
              <div className="text-xs text-gray-500">Applications</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{s.reviewed}</div>
              <div className="text-xs text-gray-500">AI Reviewed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{s.awaitingDecision}</div>
              <div className="text-xs text-gray-500">Awaiting Decision</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{s.accepted}</div>
              <div className="text-xs text-gray-500">Accepted</div>
            </div>
          </div>
        </div>
      </header>

      {/* Weights legend */}
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-medium text-gray-500">Scoring weights:</span>
          <span className="bg-gray-100 rounded px-2 py-0.5">GitHub 35%</span>
          <span className="bg-gray-100 rounded px-2 py-0.5">Papers / Posts 35%</span>
          <span className="bg-gray-100 rounded px-2 py-0.5">LinkedIn 15%</span>
          <span className="bg-gray-100 rounded px-2 py-0.5">Consistency 15%</span>
        </div>
      </div>

      {/* Table */}
      <main className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Track</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 w-48">Scores</th>
                <th className="px-5 py-3">Recommendation</th>
                <th className="px-5 py-3">Decision</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Applied{" "}
                      {new Date(a.submittedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-700">{a.appliedTrack}</span>
                  </td>
                  <td className="px-5 py-4">{statusDot(a.review.status)}</td>
                  <td className="px-5 py-4">
                    {a.review.status === "completed" && a.review.scores ? (
                      <div className="space-y-1.5 w-44">
                        {/* dimension scores are 0-10; scale to % for bar */}
                        <ScoreBar score={a.review.scores.github.score * 10} label="GitHub" />
                        <ScoreBar score={a.review.scores.papers.score * 10} label="Papers" />
                        <ScoreBar score={a.review.scores.linkedin.score * 10} label="LinkedIn" />
                        <ScoreBar score={a.review.scores.overall} label="Overall" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {a.review.recommendation
                      ? recommendationBadge(a.review.recommendation)
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    {a.humanDecision
                      ? humanDecisionBadge(a.humanDecision)
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/applicants/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
