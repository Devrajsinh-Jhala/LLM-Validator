export type FindingSeverity = "error" | "warning" | "recommendation" | "passed";

export type FindingCategory =
  | "llms.txt"
  | "crawlability"
  | "content"
  | "context"
  | "metadata";

export interface ScanFinding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  evidence?: string;
  fix?: string;
  urls?: string[];
}

export interface ScannedPage {
  url: string;
  status: number;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  wordCount: number;
  tokenEstimate: number;
  contentHash: string;
  classification: "core" | "resource" | "optional";
  internalLinks: string[];
  error?: string;
}

export interface LlmsValidation {
  exists: boolean;
  url: string;
  status: number | null;
  content: string;
  title: string;
  sections: number;
  links: number;
  errors: string[];
  warnings: string[];
}

export interface ContextWindowResult {
  size: number;
  label: string;
  usedTokens: number;
  coverage: number;
  included: string[];
  excluded: string[];
}

export interface ScanResult {
  id: string;
  requestedUrl: string;
  canonicalOrigin: string;
  hostname: string;
  siteTitle: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  score: number;
  grade: "Excellent" | "Good" | "Needs work" | "Poor";
  pages: ScannedPage[];
  llms: LlmsValidation;
  generatedLlms: string;
  findings: ScanFinding[];
  contextWindows: ContextWindowResult[];
  robotsFound: boolean;
  sitemapFound: boolean;
  scannedPages: number;
  totalTokens: number;
  disclaimer: string;
}
