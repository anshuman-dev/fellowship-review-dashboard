import type { Applicant, Recommendation, HumanDecision } from '../types'

const REC_BADGE: Record<Recommendation, string> = {
  strongly_recommend: 'bg-emerald-100 text-emerald-800',
  recommend:          'bg-green-100 text-green-800',
  borderline:         'bg-amber-100 text-amber-800',
  do_not_recommend:   'bg-red-100 text-red-800',
}
const REC_LABEL: Record<Recommendation, string> = {
  strongly_recommend: 'Strongly Recommend',
  recommend:          'Recommend',
  borderline:         'Borderline',
  do_not_recommend:   'Do Not Recommend',
}
const DEC_BADGE: Record<NonNullable<HumanDecision>, string> = {
  accepted:  'bg-blue-100 text-blue-800',
  waitlisted:'bg-purple-100 text-purple-800',
  rejected:  'bg-gray-100 text-gray-600',
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = score * 10
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-4 text-right font-mono text-gray-600">{score}</span>
    </div>
  )
}

export default function Dashboard({ applicants, onSelect }: { applicants: Applicant[]; onSelect: (id: string) => void }) {
  const total    = applicants.length
  const reviewed = applicants.filter(a => a.review.status === 'done').length
  const accepted = applicants.filter(a => a.decision === 'accepted').length
  const awaiting = applicants.filter(a => a.decision === null && a.review.status === 'done').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">Apart Research</span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">Fellowship Review</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Automated link review · Human decision is final</p>
          </div>
          <div className="flex gap-6 text-center">
            {[['Applications', total, 'text-gray-900'], ['Reviewed', reviewed, 'text-emerald-600'], ['Awaiting', awaiting, 'text-amber-600'], ['Accepted', accepted, 'text-blue-600']].map(([label, val, color]) => (
              <div key={label as string}>
                <div className={`text-2xl font-bold ${color}`}>{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-medium text-gray-500">Weights:</span>
          {['GitHub 35%','Papers/Posts 35%','LinkedIn 15%','Consistency 15%'].map(w => (
            <span key={w} className="bg-gray-100 rounded px-2 py-0.5">{w}</span>
          ))}
        </div>
      </div>

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
              {applicants.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{a.appliedTrack}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${a.review.status === 'done' ? 'bg-emerald-400' : a.review.status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} />
                      {a.review.status === 'done' ? 'Done' : a.review.status === 'running' ? 'Running…' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {a.review.scores ? (
                      <div className="space-y-1 w-44">
                        <ScoreBar score={a.review.scores.github.score} label="GitHub" />
                        <ScoreBar score={a.review.scores.papers.score} label="Papers" />
                        <ScoreBar score={a.review.scores.linkedin.score} label="LinkedIn" />
                        <ScoreBar score={Math.round(a.review.scores.overall / 10)} label="Overall" />
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    {a.review.recommendation ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REC_BADGE[a.review.recommendation]}`}>
                        {REC_LABEL[a.review.recommendation]}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    {a.decision ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DEC_BADGE[a.decision]}`}>
                        {a.decision.charAt(0).toUpperCase() + a.decision.slice(1)}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => onSelect(a.id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
