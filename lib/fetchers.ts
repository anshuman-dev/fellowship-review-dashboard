import * as cheerio from "cheerio";

export interface FetchedContent {
  url: string;
  title?: string;
  content: string;
  meta: Record<string, string | number | string[]>;
  success: boolean;
  error?: string;
}

const GH_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "ApartResearchReviewer/1.0",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
};

export async function fetchGitHub(url: string): Promise<FetchedContent> {
  try {
    const match = url.match(/github\.com\/([^/]+)(?:\/([^/?#]+))?/);
    if (!match) return { url, content: "", meta: {}, success: false, error: "Invalid GitHub URL" };
    const [, owner, repo] = match;

    const meta: Record<string, string | number | string[]> = {};
    const parts: string[] = [];

    // User profile
    const userRes = await fetch(`https://api.github.com/users/${owner}`, { headers: GH_HEADERS });
    if (userRes.ok) {
      const u = await userRes.json();
      meta.name = u.name || owner;
      meta.bio = u.bio || "";
      meta.company = u.company || "";
      meta.publicRepos = u.public_repos;
      meta.followers = u.followers;
      parts.push(`User: ${u.name || owner} | Bio: ${u.bio || "none"} | Company: ${u.company || "none"}`);
    }

    if (repo) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: GH_HEADERS });
      if (repoRes.ok) {
        const r = await repoRes.json();
        meta.repoName = r.name;
        meta.description = r.description || "";
        meta.topics = r.topics || [];
        meta.stars = r.stargazers_count;
        meta.forks = r.forks_count;
        meta.isFork = r.fork;
        meta.language = r.language || "";
        meta.updatedAt = r.updated_at;
        parts.push(`Repo: ${r.full_name} | ${r.description || "no description"} | Topics: ${(r.topics || []).join(", ") || "none"} | Stars: ${r.stargazers_count} | Fork: ${r.fork} | Updated: ${r.updated_at}`);

        const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: GH_HEADERS });
        if (readmeRes.ok) {
          const rd = await readmeRes.json();
          const text = Buffer.from(rd.content, "base64").toString("utf-8").slice(0, 3000);
          meta.readme = text;
          parts.push(`README:\n${text}`);
        }
      }
    } else {
      const reposRes = await fetch(`https://api.github.com/users/${owner}/repos?sort=pushed&per_page=12`, { headers: GH_HEADERS });
      if (reposRes.ok) {
        const repos = await reposRes.json();
        meta.repos = repos.map((r: Record<string, unknown>) => ({
          name: r.name,
          description: r.description || "",
          topics: r.topics || [],
          stars: r.stargazers_count,
          fork: r.fork,
          updatedAt: r.updated_at,
          language: r.language,
        }));
        for (const r of repos.slice(0, 12)) {
          parts.push(`- ${r.name}: ${r.description || "no desc"} [topics: ${(r.topics || []).join(",")}] ⭐${r.stargazers_count} fork:${r.fork} lang:${r.language} updated:${r.updated_at}`);
        }
      }
    }

    return { url, title: `GitHub: ${owner}`, content: parts.join("\n"), meta, success: true };
  } catch (err) {
    return { url, content: "", meta: {}, success: false, error: String(err) };
  }
}

export async function fetchArxiv(url: string): Promise<FetchedContent> {
  try {
    const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    if (!match) return fetchWebPage(url);
    const id = match[1];
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return fetchWebPage(url);
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const title = $("entry > title").text().trim();
    const summary = $("entry > summary").text().trim();
    const authors = $("entry > author > name").map((_, el) => $(el).text()).get();
    const published = $("entry > published").text().trim();
    const categories = $("entry > category").map((_, el) => $(el).attr("term") || "").get();
    return {
      url,
      title,
      content: `Title: ${title}\nAuthors: ${authors.join(", ")}\nPublished: ${published}\nCategories: ${categories.join(", ")}\nAbstract: ${summary}`,
      meta: { title, authors, published, categories, abstract: summary },
      success: true,
    };
  } catch (err) {
    return { url, content: "", meta: {}, success: false, error: String(err) };
  }
}

export async function fetchWebPage(url: string): Promise<FetchedContent> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ApartResearchReviewer/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { url, content: "", meta: {}, success: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, .ads").remove();
    const title = $("title").text().trim() || $("h1").first().text().trim();
    let content = $("article, main, .post-content, .entry-content, #content").text();
    if (content.length < 200) content = $("body").text();
    content = content.replace(/\s+/g, " ").trim().slice(0, 5000);
    return { url, title, content, meta: { title }, success: true };
  } catch (err) {
    return { url, content: "", meta: {}, success: false, error: String(err) };
  }
}

export async function fetchLink(url: string): Promise<FetchedContent> {
  if (url.includes("github.com")) return fetchGitHub(url);
  if (url.includes("arxiv.org")) return fetchArxiv(url);
  return fetchWebPage(url);
}
