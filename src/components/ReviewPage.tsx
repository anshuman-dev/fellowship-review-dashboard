import { useState } from 'react'
import type { Applicant, Recommendation, HumanDecision } from '../types'
import { fetchGitHub, fetchAny } from '../fetchers'
import { scoreGitHub, scorePapers, scoreLinkedIn, scoreConsistency, calcOverall, calcRecommendation } from '../scorer'

const REC: Record<Recommendation, { label: string; bg: string; border: string; text: string; badge: string }> = {
  strongly_recommend: { label:'Strongly Recommend', bg:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-800', badge:'bg-emerald-100 text-emerald-800' },
  recommend:          { label:'Recommend',           bg:'bg-green-50',   border:'border-green-200',   text:'text-green-700',  badge:'bg-green-100 text-green-800' },
  borderline:         { label:'Borderline',          bg:'bg-amber-50',   border:'border-amber-200',   text:'text-amber-800',  badge:'bg-amber-100 text-amber-800' },
  do_not_recommend:   { label:'Do Not Recommend',    bg:'bg-red-50',     border:'border-red-200',     text:'text-red-800',    badge:'bg-red-100 text-red-800' },
}

function ScoreCard({ label, weight, score, findings }: { label:string; weight:string; score:number; findings:string[] }) {
  const [open, setOpen] = useState(false)
  const color    = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : score > 0 ? 'text-red-500' : 'text-gray-300'
  const barColor = score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : score > 0 ? 'bg-red-400' : 'bg-gray-100'
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{weight}</span>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}<span className="text-sm font-normal text-gray-300">/10</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score * 10}%` }} />
      </div>
      {findings.length > 0 && (
        <>
          <button onClick={() => setOpen(!open)} className="text-xs text-indigo-600 hover:text-indigo-800">
            {open ? 'Hide ↑' : `${findings.length} finding${findings.length > 1 ? 's' : ''} ↓`}
          </button>
          {open && (
            <ul className="mt-2 space-y-1.5">
              {findings.map((f, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-gray-300 shrink-0">·</span><span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function ReviewPage({ applicant, onBack, onUpdate }: {
  applicant: Applicant
  onBack: () => void
  onUpdate: (data: Partial<Applicant>) => void
}) {
  const [running, setRunning]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [decisionNotes, setNotes]     = useState(applicant.decisionNotes || '')
  const [local, setLocal]             = useState(applicant)

  function sync(data: Partial<Applicant>) {
    const merged = { ...local, ...data }
    setLocal(merged)
    onUpdate(data)
  }

  async function runReview() {
    setRunning(true)
    sync({ review: { status: 'running' } })
    try {
      const { links, statement, appliedTrack } = local
      const [ghF, liF, ...rest] = await Promise.all([
        links.github   ? fetchGitHub(links.github)   : Promise.resolve(null),
        links.linkedin ? fetchAny(links.linkedin)    : Promise.resolve(null),
        ...(links.papers   || []).map(u => fetchAny(u)),
        ...(links.blogPosts|| []).map(u => fetchAny(u)),
      ])
      const gh   = scoreGitHub(ghF)
      const pp   = scorePapers(rest)
      const li   = scoreLinkedIn(liF)
      const con  = scoreConsistency(statement, appliedTrack, gh, pp)
      const overall = calcOverall({ github:gh, papers:pp, linkedin:li, consistency:con })
      const recommendation = calcRecommendation(overall)
      sync({
        review: {
          status: 'done',
          ranAt: new Date().toISOString(),
          scores: { github:gh, papers:pp, linkedin:li, consistency:con, overall },
          recommendation,
        }
      })
    } catch (e) {
      sync({ review: { status: 'pending' } })
      alert(`Review failed: ${e}`)
    } finally {
      setRunning(false)
    }
  }

  async function decide(decision: HumanDecision) {
    setSaving(true)
    sync({ decision, decisionNotes: decisionNotes || undefined })
    setSaving(false)
  }

  const { review, links } = local
  const isDone = review.status === 'done'
  const recCfg = isDone && review.recommendation ? REC[review.recommendation] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Dashboard</button>
          <span className="text-gray-200">|</span>
          <span className="text-sm font-semibold text-gray-900">{local.name}</span>
          <span className="text-sm text-gray-400">{local.email}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Application card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Application</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><div className="text-xs text-gray-400 mb-1">Track</div><div className="text-sm font-medium text-gray-800">{local.appliedTrack}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Submitted</div><div className="text-sm text-gray-700">{new Date(local.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</div></div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">Motivation Statement</div>
            <p className="text-sm text-gray-700 leading-relaxed italic">"{local.statement}"</p>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-2">Submitted Links</div>
            <div className="flex flex-wrap gap-2">
              {links.github && <a href={links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-gray-700 hover:bg-gray-100 font-medium">GitHub ↗</a>}
              {links.linkedin && <a href={links.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-blue-700 hover:bg-blue-100 font-medium">LinkedIn ↗</a>}
              {(links.papers||[]).map((p,i) => <a key={i} href={p} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs bg-purple-50 border border-purple-100 rounded px-3 py-1.5 text-purple-700 hover:bg-purple-100 font-medium">Paper {i+1} ↗</a>)}
              {(links.blogPosts||[]).map((b,i) => <a key={i} href={b} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-100 rounded px-3 py-1.5 text-orange-700 hover:bg-orange-100 font-medium">Post {i+1} ↗</a>)}
            </div>
          </div>
        </div>

        {/* Review panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Automated Review</h2>
              <p className="text-xs text-gray-400 mt-0.5">Fetches each link and scores against AI Safety criteria — no AI API</p>
            </div>
            {review.status === 'pending' && (
              <button onClick={runReview} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Run Review</button>
            )}
            {running && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Fetching links…
              </div>
            )}
            {isDone && !running && (
              <button onClick={runReview} className="text-xs text-gray-400 hover:text-gray-600">Re-run</button>
            )}
          </div>

          {running && (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
              <p>Fetching GitHub, arXiv, blog posts…</p>
              <p className="text-xs mt-1 text-gray-300">Usually 5–10 seconds</p>
            </div>
          )}

          {isDone && review.scores && recCfg && (
            <div className="divide-y divide-gray-50">
              <div className={`px-6 py-5 ${recCfg.bg} border-b ${recCfg.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${recCfg.badge}`}>{recCfg.label}</span>
                    <p className={`mt-1.5 text-xs ${recCfg.text}`}>Based on automated scan of submitted links</p>
                    {review.ranAt && <p className="text-xs text-gray-400 mt-0.5">Last run {new Date(review.ranAt).toLocaleTimeString()}</p>}
                  </div>
                  <div className="text-right ml-6">
                    <div className="text-4xl font-bold text-gray-800 tabular-nums">{review.scores.overall}</div>
                    <div className="text-xs text-gray-400">/ 100</div>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <ScoreCard label="GitHub"        weight="35%" score={review.scores.github.score}      findings={review.scores.github.findings} />
                <ScoreCard label="Papers & Posts" weight="35%" score={review.scores.papers.score}      findings={review.scores.papers.findings} />
                <ScoreCard label="LinkedIn"      weight="15%" score={review.scores.linkedin.score}    findings={review.scores.linkedin.findings} />
                <ScoreCard label="Consistency"   weight="15%" score={review.scores.consistency.score} findings={review.scores.consistency.findings} />
              </div>
            </div>
          )}
        </div>

        {/* Decision */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Your Decision</h2>
          <p className="text-xs text-gray-400 mb-4">Final call is yours — review score is a guide</p>
          {local.decision && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              Current: <span className="font-semibold capitalize">{local.decision}</span>
              {local.decisionNotes && <span className="text-gray-400 ml-2">· "{local.decisionNotes}"</span>}
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 block">Notes for the team</label>
            <textarea value={decisionNotes} onChange={e => setNotes(e.target.value)} placeholder="Add context…" rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          </div>
          <div className="flex gap-3">
            {(['accepted','waitlisted','rejected'] as NonNullable<HumanDecision>[]).map((d, i) => (
              <button key={d} onClick={() => decide(d)} disabled={saving}
                className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${i===0?'bg-blue-600 text-white hover:bg-blue-700':i===1?'bg-purple-600 text-white hover:bg-purple-700':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {d.charAt(0).toUpperCase()+d.slice(1)}
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
