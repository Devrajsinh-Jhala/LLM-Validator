import { randomUUID } from "node:crypto";

import { safeFetch } from "./fetcher";
import { classifyPage, cleanSiteTitle, generateLlms, parseHtmlPage, parseSitemap, validateLlms } from "./parser";
import { assertSafePublicUrl } from "./security";
import type {
  ContextWindowResult,
  ScanFinding,
  ScanResult,
  ScannedPage,
} from "./types";

const PAGE_LIMIT = 25;

function normalizeSeedUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    if (/\.(?:pdf|xml|txt|json|rss|atom)$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function parseRobots(value: string) {
  const sitemaps: string[] = [];
  const disallowed: string[] = [];
  let applies = false;
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const content = line.slice(separator + 1).trim();
    if (key === "sitemap" && content) sitemaps.push(content);
    if (key === "user-agent") applies = content === "*" || content.toLowerCase().includes("agentready");
    if (key === "disallow" && applies && content) disallowed.push(content);
  }
  return { sitemaps, disallowed };
}

function isAllowedByRobots(url: string, disallowed: string[]) {
  const path = new URL(url).pathname;
  return !disallowed.some((rule) => rule === "/" || (rule.endsWith("*") ? path.startsWith(rule.slice(0, -1)) : path.startsWith(rule)));
}

function contextWindows(pages: ScannedPage[]): ContextWindowResult[] {
  const ordered = [...pages].sort((a, b) => {
    const priority = { core: 0, resource: 1, optional: 2 };
    return priority[a.classification] - priority[b.classification] || a.tokenEstimate - b.tokenEstimate;
  });
  const total = ordered.reduce((sum, page) => sum + page.tokenEstimate, 0);
  return [8_000, 32_000, 128_000].map((size) => {
    let used = 0;
    const included: string[] = [];
    const excluded: string[] = [];
    for (const page of ordered) {
      if (used + page.tokenEstimate <= size) {
        used += page.tokenEstimate;
        included.push(page.url);
      } else {
        excluded.push(page.url);
      }
    }
    return {
      size,
      label: `${size / 1000}K`,
      usedTokens: used,
      coverage: total ? Math.round((included.length / ordered.length) * 100) : 0,
      included,
      excluded,
    };
  });
}

function analyze(pages: ScannedPage[], llms: ReturnType<typeof validateLlms>, robotsFound: boolean, sitemapFound: boolean) {
  const findings: ScanFinding[] = [];
  const add = (finding: ScanFinding) => findings.push(finding);

  if (!llms.exists) {
    add({ id: "llms-missing", severity: "error", category: "llms.txt", title: "No llms.txt found", description: "The site does not currently publish /llms.txt.", fix: "Review and publish the generated file at the website root." });
  } else if (llms.errors.length) {
    add({ id: "llms-invalid", severity: "error", category: "llms.txt", title: "llms.txt has structural errors", description: llms.errors.join(" "), evidence: `${llms.errors.length} validation error${llms.errors.length === 1 ? "" : "s"}`, fix: "Correct the required H1 and file-list structure before publishing." });
  } else {
    add({ id: "llms-valid", severity: "passed", category: "llms.txt", title: "llms.txt follows the proposed structure", description: "The root file has a valid title and Markdown file lists." });
  }

  if (llms.warnings.length) add({ id: "llms-guidance", severity: "warning", category: "llms.txt", title: "llms.txt can be more useful", description: llms.warnings.join(" "), fix: "Use the generated preview as a concise starting point." });
  if (!robotsFound) add({ id: "robots-missing", severity: "warning", category: "crawlability", title: "robots.txt was not found", description: "Automated clients have no site-level crawl guidance.", fix: "Publish a clear robots.txt file at the domain root." });
  if (!sitemapFound) add({ id: "sitemap-missing", severity: "warning", category: "crawlability", title: "No sitemap was discovered", description: "Important pages are harder to discover consistently.", fix: "Publish a sitemap and reference it from robots.txt." });

  const missingTitles = pages.filter((page) => !page.title);
  if (missingTitles.length) add({ id: "missing-titles", severity: "warning", category: "metadata", title: `${missingTitles.length} page${missingTitles.length === 1 ? " is" : "s are"} missing a title`, description: "Page titles provide compact retrieval context.", urls: missingTitles.slice(0, 5).map((page) => page.url), fix: "Add unique, descriptive title elements." });
  const missingDescriptions = pages.filter((page) => !page.description);
  if (missingDescriptions.length) add({ id: "missing-descriptions", severity: "recommendation", category: "metadata", title: `${missingDescriptions.length} page${missingDescriptions.length === 1 ? " has" : "s have"} no meta description`, description: "Concise descriptions improve generated link summaries.", urls: missingDescriptions.slice(0, 5).map((page) => page.url), fix: "Add accurate one-sentence descriptions to priority pages." });
  const missingH1 = pages.filter((page) => !page.h1);
  if (missingH1.length) add({ id: "missing-h1", severity: "warning", category: "content", title: `${missingH1.length} page${missingH1.length === 1 ? " is" : "s are"} missing a clear H1`, description: "The main page purpose is harder to identify.", urls: missingH1.slice(0, 5).map((page) => page.url), fix: "Give each important page one descriptive primary heading." });
  const thin = pages.filter((page) => page.wordCount < 120);
  if (thin.length) add({ id: "thin-content", severity: "recommendation", category: "content", title: `${thin.length} page${thin.length === 1 ? " has" : "s have"} very little readable text`, description: "These pages may not provide enough standalone context.", urls: thin.slice(0, 5).map((page) => page.url), fix: "Clarify the entity, offer, audience, and next action in visible copy." });

  const totalTokens = pages.reduce((sum, page) => sum + page.tokenEstimate, 0);
  if (totalTokens > 32_000) add({ id: "context-overflow", severity: "warning", category: "context", title: "The discovered content exceeds a 32K context", description: `The scanned pages total approximately ${totalTokens.toLocaleString()} tokens.`, evidence: "Token counts are estimates based on normalized text length.", fix: "Keep core pages first and move secondary content into the Optional section." });
  else add({ id: "context-compact", severity: "passed", category: "context", title: "Priority content fits a 32K context", description: `The scanned pages total approximately ${totalTokens.toLocaleString()} tokens.` });

  let score = 100;
  if (!llms.exists) score -= 25;
  else score -= Math.min(25, llms.errors.length * 10 + llms.warnings.length * 3);
  if (!robotsFound) score -= 5;
  if (!sitemapFound) score -= 8;
  score -= Math.min(12, missingTitles.length * 3);
  score -= Math.min(10, missingDescriptions.length);
  score -= Math.min(12, missingH1.length * 2);
  score -= totalTokens > 128_000 ? 15 : totalTokens > 32_000 ? 8 : 0;
  return { findings, score: Math.max(0, Math.round(score)) };
}

function gradeForScore(score: number): ScanResult["grade"] {
  return score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs work" : "Poor";
}

export function refreshScanResult(result: ScanResult): ScanResult {
  const pages = result.pages.map((page) => {
    try { return { ...page, classification: classifyPage(new URL(page.url), page.title) }; }
    catch { return page; }
  });
  const llms = validateLlms(result.llms.content, result.llms.url, result.llms.status);
  const siteTitle = cleanSiteTitle(result.siteTitle);
  const home = pages.find((page) => {
    try { return new URL(page.url).pathname === "/"; }
    catch { return false; }
  });
  const generatedLlms = generateLlms(siteTitle, home?.description || "", pages.filter((page) => page.status >= 200 && page.status < 400));
  const analysis = analyze(pages, llms, result.robotsFound, result.sitemapFound);
  return {
    ...result,
    siteTitle,
    pages,
    llms,
    generatedLlms,
    score: analysis.score,
    grade: gradeForScore(analysis.score),
    findings: analysis.findings,
    contextWindows: contextWindows(pages),
  };
}

async function crawlPage(url: string) {
  try {
    const response = await safeFetch(url);
    if (!response.contentType.includes("text/html")) return null;
    return parseHtmlPage(response.body, response.url, response.status);
  } catch (error) {
    return {
      url,
      status: 0,
      title: "",
      description: "",
      h1: "",
      canonical: "",
      wordCount: 0,
      tokenEstimate: 0,
      contentHash: "",
      classification: "optional" as const,
      internalLinks: [],
      error: error instanceof Error ? error.message : "The page could not be fetched.",
    };
  }
}

export async function scanWebsite(input: string, pageLimit = PAGE_LIMIT): Promise<ScanResult> {
  const started = Date.now();
  const requested = await assertSafePublicUrl(input);
  requested.pathname = requested.pathname || "/";
  requested.search = "";
  requested.hash = "";

  const homeResponse = await safeFetch(requested.href);
  if (!homeResponse.contentType.includes("text/html")) throw new Error("The submitted URL did not return an HTML website.");
  const home = parseHtmlPage(homeResponse.body, homeResponse.url, homeResponse.status);
  const origin = new URL(homeResponse.url).origin;

  let robotsFound = false;
  let robotsValue = "";
  try {
    const robots = await safeFetch(`${origin}/robots.txt`, { maxBytes: 500_000 });
    robotsFound = robots.status === 200 && robots.body.trim().length > 0;
    robotsValue = robotsFound ? robots.body : "";
  } catch {
    robotsFound = false;
  }
  const robots = parseRobots(robotsValue);

  let sitemapFound = false;
  let sitemapUrls: string[] = [];
  const sitemapCandidates = [...robots.sitemaps, `${origin}/sitemap.xml`].slice(0, 3);
  for (const candidate of sitemapCandidates) {
    try {
      const sitemap = await safeFetch(candidate, { maxBytes: 1_500_000 });
      if (sitemap.status === 200 && /<urlset|<sitemapindex/i.test(sitemap.body)) {
        sitemapFound = true;
        sitemapUrls.push(...parseSitemap(sitemap.body, origin));
        if (/<sitemapindex/i.test(sitemap.body)) {
          const child = sitemapUrls[0];
          if (child) {
            const childMap = await safeFetch(child, { maxBytes: 1_500_000 });
            sitemapUrls = parseSitemap(childMap.body, origin);
          }
        }
        break;
      }
    } catch {
      // Try the next declared or conventional sitemap.
    }
  }

  const queue: string[] = [home.url];
  for (const candidate of [...sitemapUrls, ...home.internalLinks]) {
    const normalized = normalizeSeedUrl(candidate, origin);
    if (normalized && isAllowedByRobots(normalized, robots.disallowed) && !queue.includes(normalized)) queue.push(normalized);
    if (queue.length >= Math.min(Math.max(pageLimit, 1), PAGE_LIMIT)) break;
  }

  const pages: ScannedPage[] = [home];
  const remaining = queue.slice(1, Math.min(Math.max(pageLimit, 1), PAGE_LIMIT));
  for (let index = 0; index < remaining.length; index += 3) {
    const batch = await Promise.all(remaining.slice(index, index + 3).map(crawlPage));
    for (const page of batch) if (page) pages.push(page);
  }

  let llmsStatus: number | null = null;
  let llmsContent = "";
  try {
    const llmsResponse = await safeFetch(`${origin}/llms.txt`, { maxBytes: 500_000 });
    llmsStatus = llmsResponse.status;
    llmsContent = llmsResponse.status === 200 ? llmsResponse.body : "";
  } catch {
    llmsStatus = null;
  }
  const llms = validateLlms(llmsContent, `${origin}/llms.txt`, llmsStatus);
  const siteTitle = cleanSiteTitle(home.title || home.h1 || new URL(origin).hostname);
  const generatedLlms = generateLlms(siteTitle, home.description, pages.filter((page) => page.status >= 200 && page.status < 400));
  const analysis = analyze(pages, llms, robotsFound, sitemapFound);
  const windows = contextWindows(pages);
  const totalTokens = pages.reduce((sum, page) => sum + page.tokenEstimate, 0);
  const completed = Date.now();

  return {
    id: randomUUID(),
    requestedUrl: input,
    canonicalOrigin: origin,
    hostname: new URL(origin).hostname,
    siteTitle,
    startedAt: new Date(started).toISOString(),
    completedAt: new Date(completed).toISOString(),
    durationMs: completed - started,
    score: analysis.score,
    grade: gradeForScore(analysis.score),
    pages,
    llms,
    generatedLlms,
    findings: analysis.findings,
    contextWindows: windows,
    robotsFound,
    sitemapFound,
    scannedPages: pages.length,
    totalTokens,
    disclaimer: "Readiness scores and token counts are transparent estimates. They do not guarantee crawling, citation, or ranking in any AI product.",
  };
}

