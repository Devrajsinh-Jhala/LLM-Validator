"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, CircleAlert, Coins, Globe2, Loader2, Plus, RefreshCw, ScanSearch, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { DashboardAccount, DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DashboardSite {
  id: string; name: string; url: string; frequency: "manual" | "weekly";
  next_scan_at: string | null; last_scan_at: string | null; latest_score: number | null;
  latest_grade: string | null; latest_status: string | null; latest_scan_id: string | null; latest_scan_at: string | null;
}

export function DashboardClient({ account }: { account: DashboardAccount }) {
  const router = useRouter();
  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState(account.organization.credits);

  const loadSites = useCallback(async () => {
    try { const response = await fetch("/api/sites", { cache: "no-store" }); const payload = await response.json() as { sites?: DashboardSite[]; credits?: number; error?: string }; if (!response.ok) throw new Error(payload.error || "Could not load sites."); setSites(payload.sites ?? []); if (typeof payload.credits === "number") setCredits(payload.credits); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load sites."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadSites(); }, [loadSites]);

  const averageScore = useMemo(() => { const values = sites.map((site) => site.latest_score).filter((value): value is number => typeof value === "number"); return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null; }, [sites]);

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form).entries());
    try { const response = await fetch("/api/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); const payload = await response.json() as { site?: DashboardSite; error?: string }; if (!response.ok || !payload.site) throw new Error(payload.error || "Could not add the site."); form.reset(); setShowAdd(false); await loadSites(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not add the site."); }
    finally { setSaving(false); }
  }

  async function runScan(siteId: string) {
    setScanning(siteId); setError("");
    try { const response = await fetch(`/api/sites/${siteId}/scans`, { method: "POST" }); const payload = await response.json() as { scan?: { id: string }; creditsRemaining?: number; error?: string }; if (!response.ok || !payload.scan) throw new Error(payload.error || "Could not complete the scan."); if (typeof payload.creditsRemaining === "number") setCredits(payload.creditsRemaining); router.push(`/dashboard/reports/${payload.scan.id}`); router.refresh(); }
    catch (scanError) { setError(scanError instanceof Error ? scanError.message : "Could not complete the scan."); await loadSites(); }
    finally { setScanning(null); }
  }

  return <DashboardShell account={{ ...account, organization: { ...account.organization, credits } }}><main className="mx-auto max-w-7xl p-5 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-teal-700">{greeting()}</p><h2 className="mt-1 text-3xl font-bold tracking-[-0.04em]">Your client sites</h2><p className="mt-2 text-sm text-slate-500">Run scans, follow changes, and share clear reports.</p></div><Button onClick={() => setShowAdd(true)}><Plus className="size-4" /> Add client site</Button></div>{error ? <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X className="size-4" /></button></div> : null}<div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon={Globe2} label="Monitored sites" value={String(sites.length)} note={sites.length ? "Across your workspace" : "Add your first client"} /><Stat icon={BarChart3} label="Average score" value={averageScore === null ? "—" : String(averageScore)} note={averageScore === null ? "No completed scans" : averageScore >= 75 ? "Healthy baseline" : "Improvements available"} /><Stat icon={Coins} label="Scan credits" value={String(credits)} note={credits > 0 ? "1 credit per completed scan" : "Contact sales to add more"} /></div><section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b px-5 py-4"><div><h3 className="text-sm font-bold">Client portfolio</h3><p className="mt-1 text-xs text-slate-400">Latest readiness status for each site</p></div><Button variant="ghost" size="sm" onClick={() => void loadSites()}><RefreshCw className="size-3.5" /> Refresh</Button></div>{loading ? <div className="grid min-h-72 place-items-center text-sm text-slate-400"><Loader2 className="size-6 animate-spin text-teal-600" /><span className="sr-only">Loading sites</span></div> : sites.length ? <div className="divide-y">{sites.slice(0, 6).map((site) => <div key={site.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/70 md:grid-cols-[1.4fr_.65fr_.65fr_auto] md:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-slate-50 text-slate-600"><Globe2 className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{site.name}</p><p className="mt-1 truncate text-xs text-slate-400">{site.url}</p></div></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Readiness</p><div className="mt-1 flex items-center gap-2"><span className={cn("text-xl font-bold", scoreTone(site.latest_score))}>{site.latest_score ?? "—"}</span>{site.latest_grade ? <Badge variant={site.latest_score && site.latest_score >= 75 ? "success" : "warning"}>{site.latest_grade}</Badge> : null}</div></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Monitoring</p><p className="mt-1 text-xs font-semibold capitalize">{site.frequency}</p><p className="mt-1 text-[10px] text-slate-400">{site.latest_scan_at ? new Date(site.latest_scan_at).toLocaleDateString() : "Never scanned"}</p></div><div className="flex gap-2 md:justify-end">{site.latest_scan_id ? <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/reports/${site.latest_scan_id}`)}>Report <ChevronRight className="size-3.5" /></Button> : null}<Button size="sm" onClick={() => void runScan(site.id)} disabled={scanning === site.id || credits < 1}>{scanning === site.id ? <><Loader2 className="size-3.5 animate-spin" /> Scanning</> : <><ScanSearch className="size-3.5" /> Scan now</>}</Button></div></div>)}</div> : <div className="grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Globe2 className="size-6" /></span><h3 className="mt-4 text-lg font-bold">Add your first client site</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Save a public website, run a genuine readiness scan, and keep its report in this workspace.</p><Button className="mt-5" onClick={() => setShowAdd(true)}>Add a site <ArrowRight className="size-4" /></Button></div></div>}</section></main>{showAdd ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false); }}><form onSubmit={addSite} className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold tracking-tight">Add a client site</h3><p className="mt-1 text-sm text-slate-500">Public websites only. Scan immediately after saving.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setShowAdd(false)} aria-label="Close"><X className="size-5" /></Button></div><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Client or site name<Input name="name" required className="mt-2" placeholder="Northstar Studio" /></label><label className="block text-sm font-semibold">Website URL<Input name="url" required type="url" className="mt-2" placeholder="https://northstar.studio" /></label><label className="block text-sm font-semibold">Monitoring<select name="frequency" defaultValue="weekly" className="mt-2 flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="weekly">Weekly</option><option value="manual">Manual only</option></select></label></div><div className="mt-7 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="size-4 animate-spin" /> Saving</> : <>Save site <ArrowRight className="size-4" /></>}</Button></div></form></div> : null}</DashboardShell>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Globe2; label: string; value: string; note: string }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600"><Icon className="size-5" /></span></div><p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">{value === "—" ? <CircleAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5 text-teal-600" />}{note}</p></div>; }
function scoreTone(score: number | null) { if (score === null) return "text-slate-400"; if (score >= 75) return "text-emerald-700"; if (score >= 50) return "text-amber-700"; return "text-rose-700"; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }

