// Browser-compatible fetchers — no Node.js deps

export interface Fetched {
  url: string
  content: string
  meta: Record<string, unknown>
  ok: boolean
  error?: string
}

const GH = 'https://api.github.com'

export async function fetchGitHub(url: string): Promise<Fetched> {
  try {
    const match = url.match(/github\.com\/([^/]+)(?:\/([^/?#]+))?/)
    if (!match) return { url, content: '', meta: {}, ok: false, error: 'Invalid GitHub URL' }
    const [, owner, repo] = match
    const headers = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'fellowship-reviewer' }
    const parts: string[] = []
    const meta: Record<string, unknown> = {}

    const userRes = await fetch(`${GH}/users/${owner}`, { headers, signal: AbortSignal.timeout(5000) })
    if (userRes.ok) {
      const u = await userRes.json()
      meta.bio = u.bio || ''
      meta.company = u.company || ''
      parts.push(`Bio: ${u.bio || 'none'} | Company: ${u.company || 'none'}`)
    }

    if (repo) {
      const rRes = await fetch(`${GH}/repos/${owner}/${repo}`, { headers, signal: AbortSignal.timeout(5000) })
      if (rRes.ok) {
        const r = await rRes.json()
        meta.repos = [{ name: r.name, description: r.description || '', topics: r.topics || [], stars: r.stargazers_count, fork: r.fork, updatedAt: r.updated_at, language: r.language }]
        parts.push(`Repo: ${r.name} | ${r.description || ''} | Topics: ${(r.topics||[]).join(',')} | Stars: ${r.stargazers_count} | Fork: ${r.fork}`)
      }
    } else {
      const rRes = await fetch(`${GH}/users/${owner}/repos?sort=pushed&per_page=12`, { headers, signal: AbortSignal.timeout(5000) })
      if (rRes.ok) {
        const repos = await rRes.json()
        meta.repos = repos.map((r: Record<string, unknown>) => ({ name: r.name, description: r.description || '', topics: r.topics || [], stars: r.stargazers_count, fork: r.fork, updatedAt: r.updated_at, language: r.language }))
        for (const r of repos) parts.push(`- ${r.name}: ${r.description||''} [${(r.topics||[]).join(',')}] ⭐${r.stargazers_count} fork:${r.fork}`)
      }
    }

    return { url, content: parts.join('\n'), meta, ok: true }
  } catch (e) {
    return { url, content: '', meta: {}, ok: false, error: String(e) }
  }
}

export async function fetchArxiv(url: string): Promise<Fetched> {
  try {
    const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/)
    if (!match) return fetchPage(url)
    const id = match[1]
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { url, content: '', meta: {}, ok: false, error: `HTTP ${res.status}` }
    const xml = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const title    = doc.querySelector('entry > title')?.textContent?.trim() || ''
    const summary  = doc.querySelector('entry > summary')?.textContent?.trim() || ''
    const authors  = [...doc.querySelectorAll('entry > author > name')].map(n => n.textContent).join(', ')
    const cats     = [...doc.querySelectorAll('entry > category')].map(n => n.getAttribute('term') || '')
    return { url, content: `Title: ${title}\nAuthors: ${authors}\nCategories: ${cats.join(', ')}\nAbstract: ${summary}`, meta: { title, categories: cats, abstract: summary }, ok: true }
  } catch (e) {
    return { url, content: '', meta: {}, ok: false, error: String(e) }
  }
}

export async function fetchPage(url: string): Promise<Fetched> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { url, content: '', meta: {}, ok: false, error: `HTTP ${res.status}` }
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,nav,footer,header').forEach(el => el.remove())
    const title = doc.title || doc.querySelector('h1')?.textContent?.trim() || ''
    const content = (doc.querySelector('article, main, .post-content') || doc.body)
      ?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 4000) || ''
    return { url, content: `Title: ${title}\n${content}`, meta: { title }, ok: true }
  } catch (e) {
    return { url, content: '', meta: {}, ok: false, error: String(e) }
  }
}

export async function fetchAny(url: string): Promise<Fetched> {
  if (url.includes('github.com')) return fetchGitHub(url)
  if (url.includes('arxiv.org')) return fetchArxiv(url)
  return fetchPage(url)
}
