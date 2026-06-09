import type { Fetched } from './fetchers'
import type { DimensionScore, ReviewScores, Recommendation } from './types'

const SAFETY_CORE = ['alignment','ai safety','ai-safety','interpretability','mechanistic','scalable oversight','corrigibility','value learning','inner alignment','outer alignment','mesa-optim','deceptive alignment','reward hacking','eliciting latent knowledge',' elk ','superposition','polysemanticity','circuits','sparse autoencoder',' sae ','steering vector','constitutional ai','rlhf','rlaif','debate','amplification','robustness','red teaming','red-teaming','sycophancy','miri','arc evals','arc alignment','redwood research','apart research']
const SAFETY_ADJ  = ['transformer','language model','llm','reinforcement learning','neural network','deep learning','machine learning','nlp','fairness','bias','ethics','governance']

function hits(text: string, kws: string[]) {
  const t = text.toLowerCase()
  return kws.filter(k => t.includes(k)).length
}

function monthsAgo(d: string) {
  return (Date.now() - new Date(d).getTime()) / (1000*60*60*24*30)
}

export function scoreGitHub(f: Fetched | null): DimensionScore {
  if (!f?.ok || !f.meta?.repos) return { score: 0, findings: [f?.error ? `GitHub: ${f.error}` : 'Could not fetch GitHub'] }

  const repos = f.meta.repos as Array<{ name:string; description:string; topics:string[]; stars:number; fork:boolean; updatedAt:string }>
  const own = repos.filter(r => !r.fork)
  let pts = 0
  const findings: string[] = []

  for (const r of own.slice(0, 10)) {
    const txt = `${r.name} ${r.description} ${r.topics.join(' ')}`
    const core = hits(txt, SAFETY_CORE)
    if (core > 0) {
      pts += 2
      const matched = SAFETY_CORE.filter(k => txt.toLowerCase().includes(k)).slice(0,3).join(', ')
      findings.push(`"${r.name}" — AI Safety related (${matched})`)
      if (r.stars > 10) { pts += 0.5; findings.push(`"${r.name}" has ${r.stars} ⭐`) }
      if (monthsAgo(r.updatedAt) <= 12) pts += 0.5
    } else if (hits(txt, SAFETY_ADJ) > 0) {
      pts += 0.3
    }
  }

  const bioTxt = `${f.meta.bio || ''} ${f.meta.company || ''}`
  if (hits(bioTxt, SAFETY_CORE) > 0) { pts += 1; findings.push('Bio/company mentions AI Safety') }
  if (own.length === 0) findings.push('No original repos (all forks)')
  if (pts === 0) findings.push('No AI Safety-related repos found')

  return { score: Math.min(10, Math.round(pts)), findings }
}

export function scorePapers(fetched: Array<Fetched | null>): DimensionScore {
  const good = fetched.filter(f => f?.ok && f.content.length > 50) as Fetched[]
  if (good.length === 0) return { score: 0, findings: ['No papers or posts could be fetched'] }

  let pts = 0
  const findings: string[] = []

  for (const f of good) {
    const txt = `${f.content}`
    const core = hits(txt, SAFETY_CORE)
    const cats = (f.meta?.categories as string[]) || []

    if (f.url.includes('arxiv.org')) {
      if (core >= 3) { pts += 3; findings.push(`arXiv paper — strong AI Safety content (${core} keyword hits)`) }
      else if (core > 0 || cats.some(c => ['cs.AI','cs.LG','cs.CL'].includes(c))) { pts += 1.5; findings.push(`arXiv paper — adjacent ML work`) }
      else findings.push('arXiv paper — not clearly AI Safety-related')
    } else if (f.url.includes('lesswrong') || f.url.includes('alignmentforum')) {
      if (core >= 2) { pts += 3; findings.push('LessWrong/AF post — directly on AI Safety') }
      else { pts += 1; findings.push('LessWrong/AF post — limited AI Safety depth') }
    } else {
      if (core >= 2) { pts += 2; findings.push(`Post "${(f.meta?.title as string) || f.url}" — relevant AI Safety content`) }
      else if (hits(txt, SAFETY_ADJ) > 0) { pts += 0.5; findings.push(`Post — general ML, weak safety focus`) }
      else findings.push(`Post — not AI Safety-related`)
    }
  }

  return { score: Math.min(10, Math.round(pts)), findings }
}

export function scoreLinkedIn(f: Fetched | null): DimensionScore {
  if (!f?.ok || f.content.length < 100) {
    return { score: 0, findings: ['LinkedIn blocked automated access — open manually to verify'] }
  }
  const ORGS = ['deepmind','openai','anthropic','google brain','miri','redwood research','arc alignment','arc evals','conjecture','apart research','university','phd','research scientist','research engineer','mit','stanford','oxford','cambridge','cmu','berkeley','eth']
  let pts = 0
  const findings: string[] = []
  const core = hits(f.content, SAFETY_CORE)
  const org  = hits(f.content.toLowerCase(), ORGS)
  if (core >= 2) { pts += 4; findings.push(`Profile mentions AI Safety topics (${core} hits)`) }
  else if (core > 0) { pts += 2; findings.push('Profile mentions AI Safety-adjacent topics') }
  if (org >= 2) { pts += 3; findings.push('Relevant research orgs/institutions found') }
  else if (org > 0) { pts += 1.5; findings.push('Some relevant background found') }
  if (pts === 0) findings.push('No relevant AI Safety or research background detected')
  return { score: Math.min(10, Math.round(pts)), findings }
}

export function scoreConsistency(statement: string, track: string, gh: DimensionScore, papers: DimensionScore): DimensionScore {
  let pts = 0
  const findings: string[] = []
  if (gh.score >= 5 && papers.score >= 5) { pts += 4; findings.push('GitHub and published work both show AI Safety focus') }
  else if (gh.score >= 3 || papers.score >= 3) { pts += 2; findings.push('One dimension shows AI Safety work, other is weak') }
  else findings.push('Neither GitHub nor papers show clear AI Safety work')

  const trackKws: Record<string, string[]> = {
    'mechanistic interpretability': ['interpretability','circuits','features','superposition','mechanistic'],
    'scalable oversight':           ['oversight','debate','amplification','evaluation','scalable'],
    'robustness':                   ['robustness','red team','adversarial','attack','jailbreak'],
  }
  const trackTerms = Object.entries(trackKws).find(([k]) => track.toLowerCase().includes(k))?.[1] || SAFETY_CORE
  const stmtHits = hits(statement, trackTerms)
  if (stmtHits >= 2) { pts += 3; findings.push(`Statement aligns with ${track} track`) }
  else if (stmtHits > 0) { pts += 1.5; findings.push('Statement partially aligns with track') }
  else findings.push(`Statement doesn't reference ${track} concepts`)
  if (gh.score >= 4 && stmtHits > 0) { pts += 2; findings.push('GitHub substantiates statement claims') }
  return { score: Math.min(10, Math.round(pts)), findings }
}

export function calcOverall(s: Omit<ReviewScores,'overall'>): number {
  return Math.round(s.github.score * 3.5 + s.papers.score * 3.5 + s.linkedin.score * 1.5 + s.consistency.score * 1.5)
}

export function calcRecommendation(n: number): Recommendation {
  if (n >= 80) return 'strongly_recommend'
  if (n >= 65) return 'recommend'
  if (n >= 45) return 'borderline'
  return 'do_not_recommend'
}
