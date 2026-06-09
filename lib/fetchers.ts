import * as cheerio from "cheerio";

export interface FetchedContent {
  url: string;
  title?: string;
  content: string;
  success: boolean;
  error?: string;
}

export async function fetchGitHubProfile(profileOrRepoUrl: string): Promise<FetchedContent> {
  try {
    // Parse GitHub URL — could be profile or specific repo
    const match = profileOrRepoUrl.match(/github\.com\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return { url: profileOrRepoUrl, content: "", success: false, error: "Invalid GitHub URL" };

    const [, owner, repo] = match;
    const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json", "User-Agent": "Apart-Research-Reviewer/1.0" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;

    const parts: string[] = [];

    // Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${owner}`, { headers });
    if (userRes.ok) {
      const user = await userRes.json();
      parts.push(`GitHub User: ${user.name || owner}`);
      if (user.bio) parts.push(`Bio: ${user.bio}`);
      if (user.company) parts.push(`Company/Affiliation: ${user.company}`);
      parts.push(`Public repos: ${user.public_repos}, Followers: ${user.followers}`);
    }

    if (repo) {
      // Specific repo
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        parts.push(`\nRepository: ${repoData.full_name}`);
        parts.push(`Description: ${repoData.description || "none"}`);
        parts.push(`Stars: ${repoData.stargazers_count}, Forks: ${repoData.forks_count}`);
        parts.push(`Topics: ${(repoData.topics || []).join(", ") || "none"}`);
        parts.push(`Language: ${repoData.language || "unknown"}`);
        parts.push(`Last updated: ${repoData.updated_at}`);

        // Fetch README
        const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
        if (readmeRes.ok) {
          const readmeData = await readmeRes.json();
          const readmeText = Buffer.from(readmeData.content, "base64").toString("utf-8");
          parts.push(`\nREADME (first 2000 chars):\n${readmeText.slice(0, 2000)}`);
        }
      }
    } else {
      // Fetch top repos
      const reposRes = await fetch(`https://api.github.com/users/${owner}/repos?sort=stars&per_page=8`, { headers });
      if (reposRes.ok) {
        const repos = await reposRes.json();
        parts.push("\nTop repositories:");
        for (const r of repos) {
          parts.push(`- ${r.name}: ${r.description || "no description"} [${(r.topics || []).join(", ") || "no topics"}] ⭐${r.stargazers_count}`);
        }
      }
    }

    return { url: profileOrRepoUrl, title: `GitHub: ${owner}`, content: parts.join("\n"), success: true };
  } catch (err) {
    return { url: profileOrRepoUrl, content: "", success: false, error: String(err) };
  }
}

export async function fetchWebPage(url: string): Promise<FetchedContent> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ApartResearchBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { url, content: "", success: false, error: `HTTP ${res.status}` };

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, nav, footer, header, .ads, #ads, .cookie-banner").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();

    // Try article/main content first
    let content = $("article, main, .post-content, .entry-content, #content").text();
    if (content.length < 200) content = $("body").text();

    // Normalize whitespace
    content = content.replace(/\s+/g, " ").trim().slice(0, 4000);

    return { url, title, content, success: true };
  } catch (err) {
    return { url, content: "", success: false, error: String(err) };
  }
}

export async function fetchArxivPaper(url: string): Promise<FetchedContent> {
  try {
    // Extract arXiv ID
    const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    if (!match) return fetchWebPage(url);

    const id = match[1];
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return fetchWebPage(url);

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const title = $("entry > title").text().trim();
    const summary = $("entry > summary").text().trim();
    const authors = $("entry > author > name").map((_, el) => $(el).text()).get().join(", ");
    const published = $("entry > published").text().trim();
    const categories = $("entry > category").map((_, el) => $(el).attr("term")).get().join(", ");

    const content = `Title: ${title}\nAuthors: ${authors}\nPublished: ${published}\nCategories: ${categories}\n\nAbstract:\n${summary}`;

    return { url, title, content, success: true };
  } catch (err) {
    return { url, content: "", success: false, error: String(err) };
  }
}

export async function fetchLink(url: string): Promise<FetchedContent> {
  if (url.includes("github.com")) return fetchGitHubProfile(url);
  if (url.includes("arxiv.org")) return fetchArxivPaper(url);
  return fetchWebPage(url);
}
