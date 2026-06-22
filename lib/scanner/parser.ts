import { createHash } from "node:crypto";

import type { LlmsValidation, ScannedPage } from "./types";

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function cleanText(value: string) {
  return decodeEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, pattern: RegExp) {
  const match = pattern.exec(html);
  return match ? cleanText(match[1] ?? "") : "";
}

function tagAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = pattern.exec(tag);
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function findMeta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const normalized = key.toLowerCase();
  for (const tag of tags) {
    const name = tagAttribute(tag, "name").toLowerCase();
    const property = tagAttribute(tag, "property").toLowerCase();
    if (name === normalized || property === normalized) return tagAttribute(tag, "content");
  }
  return "";
}

function findCanonical(html: string, baseUrl: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (tagAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical")) {
      const href = tagAttribute(tag, "href");
      try {
        return new URL(href, baseUrl).href;
      } catch {
        return "";
      }
    }
  }
  return "";
}

export function classifyPage(url: URL, title: string): ScannedPage["classification"] {
  const value = `${url.pathname} ${title}`.toLowerCase();
  if (/\b(pricing|products?|projects?|portfolio|work|services?|solutions?|about|contact|docs?|features?|research|publications?|case-stud(?:y|ies)|resume|cv)\b/.test(value)) return "core";
  if (/\b(blog|guide|resource|help|support|tutorial|learn)\b/.test(value)) return "resource";
  return url.pathname === "/" ? "core" : "optional";
}

export function parseHtmlPage(html: string, finalUrl: string, status: number): ScannedPage {
  const url = new URL(finalUrl);
  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const description = findMeta(html, "description") || findMeta(html, "og:description");
  const canonical = findCanonical(html, finalUrl);
  const text = cleanText(html);
  const words = text ? text.split(/\s+/).length : 0;
  const links = new Set<string>();
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = tagAttribute(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const target = new URL(href, finalUrl);
      if (target.origin !== url.origin || !["http:", "https:"].includes(target.protocol)) continue;
      target.hash = "";
      if ([...target.searchParams.keys()].some((key) => /^(utm_|gclid|fbclid)/i.test(key))) target.search = "";
      if (/\.(?:jpg|jpeg|png|gif|webp|svg|ico|zip|mp4|mp3|woff2?|ttf)$/i.test(target.pathname)) continue;
      links.add(target.href);
    } catch {
      // Ignore malformed links found in third-party content.
    }
  }

  return {
    url: finalUrl,
    status,
    title,
    description,
    h1,
    canonical,
    wordCount: words,
    tokenEstimate: Math.max(1, Math.ceil(text.length / 4)),
    contentHash: createHash("sha256").update(text).digest("hex").slice(0, 24),
    classification: classifyPage(url, title),
    internalLinks: [...links],
  };
}

export function parseSitemap(xml: string, baseUrl: string) {
  const urls: string[] = [];
  for (const match of xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const value = decodeEntities(match[1].trim());
    try {
      urls.push(new URL(value, baseUrl).href);
    } catch {
      // Ignore malformed entries rather than failing the whole sitemap.
    }
  }
  return [...new Set(urls)];
}

export function validateLlms(content: string, url: string, status: number | null): LlmsValidation {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const exists = status !== null && status !== 404;
  if (!exists) {
    return { exists: false, url, status, content, title: "", sections: 0, links: 0, errors: [], warnings: [] };
  }
  const lines = normalized.split("\n");
  const nonEmpty = lines.filter((line) => line.trim());
  const h1Lines = lines.filter((line) => /^#\s+\S/.test(line));
  const h2Lines = lines.filter((line) => /^##\s+\S/.test(line));
  const deeperHeadings = lines.filter((line) => /^#{3,}\s+/.test(line));
  const linkMatches = [...normalized.matchAll(/^-\s+\[[^\]]+\]\(https?:\/\/[^)]+\)(?::\s*.*)?$/gm)];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (status !== 200) errors.push("/llms.txt must return HTTP 200.");
  if (!normalized.trim()) errors.push("The file is empty.");
  if (h1Lines.length === 0) errors.push("A project or site name using an H1 is required.");
  if (h1Lines.length > 1) errors.push("The file should contain exactly one H1.");
  if (nonEmpty[0] && !/^#\s+\S/.test(nonEmpty[0])) errors.push("The first content line should be the H1 title.");
  if (deeperHeadings.length) errors.push("File-list sections should use H2 headings, not H3 or deeper headings.");
  if (!lines.some((line) => /^>\s+\S/.test(line))) warnings.push("Add a concise blockquote summary after the H1.");
  if (h2Lines.length === 0) warnings.push("Add at least one H2 file-list section.");
  if (h2Lines.length > 0 && linkMatches.length === 0) errors.push("H2 sections should contain Markdown list links with absolute URLs.");
  if (!h2Lines.some((line) => /^##\s+Optional\s*$/i.test(line))) warnings.push("Consider an Optional section for lower-priority context.");

  return {
    exists: status !== null && status !== 404,
    url,
    status,
    content,
    title: h1Lines[0]?.replace(/^#\s+/, "").trim() ?? "",
    sections: h2Lines.length,
    links: linkMatches.length,
    errors,
    warnings,
  };
}

function markdownText(value: string) {
  return value.replace(/[\[\]<>]/g, "").replace(/\s+/g, " ").trim();
}

export function cleanSiteTitle(value: string) {
  const cleaned = markdownText(value)
    .replace(/^(?:home|homepage|welcome)\s*[-|:–—]\s*/i, "")
    .replace(/\s*[-|:–—]\s*(?:home|homepage|portfolio|official site)$/i, "")
    .trim();
  return cleaned || "Website";
}

function lineForPage(page: ScannedPage, siteTitle: string) {
  let label = markdownText(page.title || page.h1 || new URL(page.url).pathname || "Home");
  if (label.toLowerCase().endsWith(siteTitle.toLowerCase())) {
    const shorter = label.slice(0, -siteTitle.length).replace(/\s*[-|:–—]\s*$/, "").trim();
    if (shorter) label = shorter;
  }
  const description = markdownText(page.description || page.h1 || "Important website page");
  return `- [${label}](${page.url}): ${description}`;
}

export function generateLlms(siteTitle: string, siteDescription: string, pages: ScannedPage[]) {
  const core = pages.filter((page) => page.classification === "core").slice(0, 12);
  const resources = pages.filter((page) => page.classification === "resource").slice(0, 12);
  const optional = pages.filter((page) => page.classification === "optional").slice(0, 12);
  const title = cleanSiteTitle(siteTitle);
  const summary = markdownText(siteDescription) || `Official pages and resources for ${title}.`;
  const sections: string[] = [`# ${title}`, "", `> ${summary}`];

  if (core.length) sections.push("", "## Core", "", ...core.map((page) => lineForPage(page, title)));
  if (resources.length) sections.push("", "## Resources", "", ...resources.map((page) => lineForPage(page, title)));
  if (optional.length) sections.push("", "## Optional", "", ...optional.map((page) => lineForPage(page, title)));
  return `${sections.join("\n").trim()}\n`;
}


