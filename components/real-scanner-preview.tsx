"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  ScanSearch,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScanResult } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

export function RealScannerPreview() {
  const [url, setUrl] = useState("https://example.com");
  const [state, setState] = useState<"idle" | "scanning" | "done">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [creditExhausted, setCreditExhausted] = useState(false);

  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname || "example.com";
    } catch {
      return "example.com";
    }
  }, [url]);

  async function handleScan(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setError("Enter a full public URL, for example https://example.com");
      return;
    }

    setError("");
    setCreditExhausted(false);
    setResult(null);
    setState("scanning");
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as { result?: ScanResult; code?: string; error?: string };
      if (!response.ok || !payload.result) {
        if (payload.code === "GUEST_CREDIT_USED") setCreditExhausted(true);
        throw new Error(payload.error || "The scan could not be completed.");
      }
      setResult(payload.result);
      setState("done");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "The scan could not be completed.");
      setState("idle");
    }
  }

  function downloadLlms() {
    if (!result) return;
    const blob = new Blob([result.generatedLlms], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = "llms.txt";
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  const llmsScore = result
    ? result.llms.exists
      ? Math.max(0, 100 - result.llms.errors.length * 25 - result.llms.warnings.length * 5)
      : 0
    : 0;
  const contentIssues = result?.findings.filter(
    (finding) => ["content", "metadata"].includes(finding.category) && finding.severity !== "passed",
  ).length ?? 0;
  const contentScore = result ? Math.max(35, 100 - contentIssues * 12) : 0;
  const contextScore = result?.contextWindows.find((window) => window.size === 32_000)?.coverage ?? 0;
  const openFindings = result?.findings.filter((finding) => finding.severity !== "passed") ?? [];

  return (
    <div className="relative mx-auto w-full max-w-[570px] lg:mx-0">
      <div className="absolute -inset-10 -z-10 rounded-full bg-teal-200/25 blur-3xl" />
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="size-2 rounded-full bg-slate-200" />
              <span className="size-2 rounded-full bg-slate-200" />
              <span className="size-2 rounded-full bg-slate-200" />
            </div>
            <span className="ml-2 text-xs font-semibold text-slate-500">Live website scanner</span>
          </div>
          <Badge variant="success" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Functional
          </Badge>
        </div>

        <div className="p-5 sm:p-6">
          <form onSubmit={handleScan}>
            <label htmlFor="live-site-url" className="mb-2 block text-sm font-semibold text-slate-900">
              Check a website’s AI readiness
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe2 className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="live-site-url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setResult(null);
                    setState("idle");
                  }}
                  className="pl-10"
                  aria-describedby={error ? "live-url-error" : undefined}
                />
              </div>
              <Button type="submit" disabled={state === "scanning"} className="min-w-[124px]">
                {state === "scanning" ? (
                  <><ScanSearch className="size-4 animate-pulse" /> Scanning</>
                ) : (
                  <>Run scan <ArrowRight className="size-4" /></>
                )}
              </Button>
            </div>
            {error ? <div id="live-url-error" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"><p>{error}</p>{creditExhausted ? <div className="mt-2 flex gap-3"><a href="/register" className="font-bold underline">Get 3 free credits</a><a href="mailto:jhaladevrajsinh11@gmail.com" className="font-bold underline">Contact sales</a></div> : null}</div> : null}
            <p className="mt-2 text-xs text-slate-400">1 free guest scan every 24 hours · Up to 25 public pages · Private networks are blocked.</p>
          </form>

          <div className="mt-5 grid grid-cols-[112px_1fr] gap-5 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-[126px_1fr] sm:p-5">
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 py-4">
              <div className="relative grid size-[74px] place-items-center rounded-full bg-[conic-gradient(#2dd4bf_0deg,#2dd4bf_302deg,#334155_302deg)]">
                <div className="grid size-[62px] place-items-center rounded-full bg-slate-950">
                  <span className="text-2xl font-bold tracking-tight">
                    {state === "scanning" ? "…" : result ? result.score : "--"}
                  </span>
                </div>
              </div>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Readiness</span>
            </div>
            <div className="min-w-0 py-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{result?.hostname ?? hostname}</p>
                <span className="text-[11px] text-slate-400">{result?.grade ?? "Ready"}</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["llms.txt structure", llmsScore, "bg-teal-400"],
                  ["Content clarity", contentScore, "bg-indigo-400"],
                  ["Context efficiency", contextScore, "bg-amber-400"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-semibold">{result ? `${value}%` : "—"}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", color)}
                        style={{ width: result ? `${value}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border border-slate-100 bg-slate-50 py-3 text-center">
            {[
              [result ? String(result.scannedPages) : "—", "Pages"],
              [result ? String(openFindings.length) : "—", "Findings"],
              [result ? `${(result.totalTokens / 1000).toFixed(1)}K` : "—", "Tokens"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-sm font-bold text-slate-900">{value}</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {result ? (
            <div className="mt-4 rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", openFindings.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                    {openFindings.length ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{openFindings[0]?.title ?? "No priority issues found"}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">Completed in {(result.durationMs / 1000).toFixed(1)} seconds</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={downloadLlms}>
                  <Download className="size-3.5" /> llms.txt
                </Button>
              </div>
            </div>
          ) : null}

          {state === "scanning" ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-teal-800">
              <FileText className="size-4 animate-pulse" /> Discovering sitemap, metadata, and public pages…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
