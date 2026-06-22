"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, Loader2, Radar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const secret = String(new FormData(event.currentTarget).get("secret") || ""); try { const response = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Could not sign in."); router.push("/admin"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); setLoading(false); } }
  return <div className="min-h-screen bg-slate-950 px-5 py-10 text-white"><div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center"><div className="w-full rounded-[28px] border border-white/10 bg-white p-7 text-slate-950 shadow-2xl sm:p-10"><Link href="/" className="flex items-center gap-2.5 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white"><Radar className="size-5" /></span>AgentReady</Link><p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Private operations</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Administrator console</h1><p className="mt-3 text-sm leading-6 text-slate-500">Use the ADMIN_SECRET from your environment. It is exchanged for a secure 12-hour session.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-semibold">Administrator secret<div className="relative mt-2"><KeyRound className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" /><Input name="secret" type="password" required className="pl-10" autoComplete="current-password" /></div></label>{error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin" /> Signing in</> : <>Open console <ArrowRight className="size-4" /></>}</Button></form></div></div></div>;
}
