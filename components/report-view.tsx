"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  Link2,
  Radar,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScanFinding, ScanResult } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

interface ReportBranding {
  brandName: string;
  accentColor: string;
  footer: string;
  contactEmail?: string | null;
}

export function ReportView({ result, branding, shareToken, publicView = false }: { result: ScanResult; branding: ReportBranding; shareToken?: string | null; publicView?: boolean }) {
  const [copied, setCopied] = useState<"file" | "link" | null>(null);
  const openFindings = result.findings.filter((finding) => finding.severity !== "passed");
  const liveLlmsPenalty = result.llms.exists ? Math.min(25, result.llms.errors.length * 10 + result.llms.warnings.length * 3) : 25;
  const technicalGain = liveLlmsPenalty + (result.robotsFound ? 0 : 5) + (result.sitemapFound ? 0 : 8);
  const potentialScore = Math.min(100, result.score + technicalGain);
  const technicalFixes = Number(liveLlmsPenalty > 0) + Number(!result.robotsFound) + Number(!result.sitemapFound);
  const technicalFixLabel = `${technicalFixes} technical ${technicalFixes === 1 ? "fix" : "fixes"}`;

  function downloadLlms() {
    const blob = new Blob([result.generatedLlms], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "llms.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyFile() {
    await navigator.clipboard.writeText(result.generatedLlms);
    setCopied("file");
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyLink() {
    if (!shareToken) return;
    const link = `${window.location.origin}/reports/${shareToken}`;
    await navigator.clipboard.writeText(link);
    setCopied("link");
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="min-h-screen bg-slate-50/80">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: branding.accentColor }}><Radar className="size-[19px]" /></span>
            <div><p className="text-sm font-bold">{branding.brandName}</p><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">AI readiness report</p></div>
          </div>
          <div className="flex items-center gap-2">
            {!publicView ? <Button variant="outline" size="sm" asChild><a href="/dashboard"><ArrowLeft className="size-3.5" /> Dashboard</a></Button> : null}
            {!publicView && shareToken ? <Button size="sm" onClick={copyLink}>{copied === "link" ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied === "link" ? "Copied" : "Share report"}</Button> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Badge variant={result.score >= 75 ? "success" : "warning"} className="mb-4">{result.grade} readiness</Badge>
            <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">{result.siteTitle}</h1>
            <a href={result.canonicalOrigin} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-950">{result.hostname}<ExternalLink className="size-3.5" /></a>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copyFile}>{copied === "file" ? <Check className="size-4" /> : <Clipboard className="size-4" />}{copied === "file" ? "Copied" : "Copy llms.txt"}</Button><Button onClick={downloadLlms}><Download className="size-4" /> Download file</Button></div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-[1.05fr_1fr_1fr_1fr]">
          <div className="flex items-center gap-5 rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
            <div className="grid size-20 shrink-0 place-items-center rounded-full border-[7px] border-teal-400/90"><span className="text-2xl font-bold">{result.score}</span></div>
            <div><p className="text-xs font-semibold text-slate-400">Readiness score</p><p className="mt-1 text-lg font-bold">{result.grade}</p>{potentialScore > result.score ? <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-teal-300"><ArrowUpRight className="size-3" /> Up to {potentialScore} after {technicalFixLabel}</p> : <p className="mt-1 text-[10px] text-slate-500">Transparent rule-based score</p>}</div>
          </div>
          <Metric icon={Globe2} label="Pages analyzed" value={String(result.scannedPages)} note={result.sitemapFound ? "Sitemap discovered" : "Link discovery used"} />
          <Metric icon={FileText} label="Estimated context" value={`${(result.totalTokens / 1000).toFixed(1)}K`} note="Normalized page text" />
          <Metric icon={AlertTriangle} label="Open findings" value={String(openFindings.length)} note={`${result.findings.filter((finding) => finding.severity === "error").length} critical`} />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-bold">Prioritized findings</h2><p className="mt-1 text-xs text-slate-400">Evidence and practical remediation</p></div><Badge variant="outline">{result.findings.length} checks</Badge></div>
            <div className="divide-y">
              {result.findings.map((finding) => <Finding key={finding.id} finding={finding} />)}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Context coverage</h2><p className="mt-1 text-xs text-slate-400">Pages fitting each estimated window</p></div><Badge variant="outline">Estimated</Badge></div>
              <div className="mt-6 space-y-5">
                {result.contextWindows.map((window) => (
                  <div key={window.size}>
                    <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold">{window.label} context</span><span className="text-slate-400">{window.coverage}% coverage</span></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${window.coverage}%` }} /></div>
                    <p className="mt-2 text-[10px] text-slate-400">{window.included.length} included · {window.excluded.length} excluded</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><span className={cn("grid size-10 place-items-center rounded-xl", result.llms.exists && !result.llms.errors.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}><ShieldCheck className="size-5" /></span><div><h2 className="text-sm font-bold">Live llms.txt validation</h2><p className="mt-1 text-xs text-slate-400">{result.llms.exists ? `${result.llms.sections} sections · ${result.llms.links} links` : "No file is published at /llms.txt"}</p></div></div>
              {result.llms.exists ? <div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-rose-600">{result.llms.errors.length}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Errors</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-amber-600">{result.llms.warnings.length}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Warnings</p></div></div> : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><Badge variant="warning">Not published</Badge><p className="mt-2 text-xs leading-5 text-amber-900">Structural errors are not counted for an absent file. Publish the generated draft below, then rescan to validate the live version.</p><a href="#generated-llms" className="mt-2 inline-flex text-xs font-bold text-amber-900 underline underline-offset-2">Review generated draft</a></div>}
            </section>
          </div>
        </div>

        <section id="generated-llms" className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold">Generated llms.txt draft</h2><Badge variant="outline">Suggested</Badge></div><p className="mt-1 text-xs text-slate-400">Review this deterministic suggestion before publishing it at the website root.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={copyFile}><Clipboard className="size-3.5" /> Copy</Button><Button size="sm" onClick={downloadLlms}><Download className="size-3.5" /> Download</Button></div></div>
          <pre className="max-h-[430px] overflow-auto bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-200 sm:p-6"><code>{result.generatedLlms}</code></pre>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4"><h2 className="text-sm font-bold">Crawled pages</h2><p className="mt-1 text-xs text-slate-400">Metadata and estimated context contribution</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Page</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Words</th><th className="px-5 py-3 text-right">Tokens</th></tr></thead><tbody className="divide-y">{result.pages.map((page) => <tr key={page.url}><td className="max-w-md px-5 py-3.5"><p className="truncate font-semibold">{page.title || page.h1 || page.url}</p><p className="mt-1 truncate text-[10px] text-slate-400">{page.url}</p></td><td className="px-4 py-3.5"><span className={cn("font-bold", page.status >= 200 && page.status < 400 ? "text-emerald-700" : "text-rose-700")}>{page.status || "Failed"}</span></td><td className="px-4 py-3.5 capitalize text-slate-500">{page.classification}</td><td className="px-4 py-3.5 text-slate-500">{page.wordCount.toLocaleString()}</td><td className="px-5 py-3.5 text-right font-medium">{page.tokenEstimate.toLocaleString()}</td></tr>)}</tbody></table></div>
        </section>

        <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"><Info className="mt-0.5 size-4 shrink-0 text-slate-400" /><p>{result.disclaimer}</p></div>
      </main>

      <footer className="border-t bg-white py-6"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 text-xs text-slate-400 sm:flex-row sm:px-8"><p>{branding.footer}</p>{branding.contactEmail ? <a href={`mailto:${branding.contactEmail}`} className="font-medium hover:text-slate-950">{branding.contactEmail}</a> : null}</div></footer>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Globe2; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div><span className="grid size-9 place-items-center rounded-xl bg-slate-50 text-slate-500"><Icon className="size-4" /></span></div><p className="mt-3 text-[10px] text-slate-400">{note}</p></div>;
}

function Finding({ finding }: { finding: ScanFinding }) {
  const styles = {
    error: ["bg-rose-50 text-rose-700", AlertTriangle, "Critical"],
    warning: ["bg-amber-50 text-amber-700", AlertTriangle, "Warning"],
    recommendation: ["bg-indigo-50 text-indigo-700", Info, "Improve"],
    passed: ["bg-emerald-50 text-emerald-700", CheckCircle2, "Passed"],
  } as const;
  const [tone, Icon, label] = styles[finding.severity];
  return <div className="flex items-start gap-3 px-5 py-4"><span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", tone)}><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-bold">{finding.title}</h3><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span></div><p className="mt-1.5 text-xs leading-5 text-slate-500">{finding.description}</p>{finding.fix ? <p className="mt-2 text-[11px] font-medium text-slate-700"><span className="text-teal-700">Fix:</span> {finding.fix}</p> : null}{finding.urls?.length ? <div className="mt-2 space-y-1">{finding.urls.slice(0, 3).map((url) => <p key={url} className="truncate text-[10px] text-slate-400">{url}</p>)}</div> : null}</div></div>;
}





