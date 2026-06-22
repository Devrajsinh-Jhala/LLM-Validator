"use client";

import { FormEvent, ReactNode, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, Radar, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecoveryFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50 px-5 py-10"><div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center"><div className="w-full rounded-[28px] border bg-white p-7 shadow-soft sm:p-10"><Link href="/" className="flex items-center gap-2.5 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white"><Radar className="size-5" /></span>AgentReady</Link><div className="mt-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>{children}</div></div></div></div>;
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const email = String(new FormData(event.currentTarget).get("email") || "");
    try {
      const response = await fetch("/api/auth/password/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json() as { error?: string; deliveryConfigured?: boolean };
      if (!response.ok) throw new Error(payload.error || "Could not request a reset link.");
      setMessage({ kind: "success", text: payload.deliveryConfigured ? "If that account exists, a reset link is on its way." : "Email delivery is not configured yet. Please contact support for a password reset." });
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not request a reset link." }); }
    finally { setLoading(false); }
  }
  return <><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-semibold">Email address<div className="relative mt-2"><Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" /><Input name="email" type="email" required autoComplete="email" className="pl-10" placeholder="you@agency.com" /></div></label>{message ? <Status message={message} /> : null}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin" /> Sending</> : <>Send reset link <ArrowRight className="size-4" /></>}</Button></form><BackToLogin /></>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const data = new FormData(event.currentTarget); const password = String(data.get("password") || ""); const confirmation = String(data.get("confirmation") || "");
    if (password !== confirmation) { setMessage({ kind: "error", text: "The passwords do not match." }); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Could not reset the password.");
      setMessage({ kind: "success", text: "Password updated. Taking you to sign in…" }); window.setTimeout(() => router.push("/login"), 900);
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not reset the password." }); setLoading(false); }
  }
  return <><form onSubmit={submit} className="mt-8 space-y-4"><PasswordField name="password" label="New password" /><PasswordField name="confirmation" label="Confirm password" />{message ? <Status message={message} /> : null}<Button type="submit" size="lg" className="w-full" disabled={loading || !token}>{loading ? <><Loader2 className="size-4 animate-spin" /> Updating</> : <><KeyRound className="size-4" /> Update password</>}</Button></form><BackToLogin /></>;
}

export function VerifyEmailAction({ token }: { token: string }) {
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  async function verify() {
    setLoading(true); setMessage(null);
    try { const response = await fetch("/api/auth/verification/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Could not verify this email."); setMessage({ kind: "success", text: "Email verified. Your workspace is secured." }); }
    catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not verify this email." }); }
    finally { setLoading(false); }
  }
  return <div className="mt-8 space-y-4">{message ? <Status message={message} /> : null}<Button size="lg" className="w-full" onClick={verify} disabled={loading || !token}>{loading ? <><Loader2 className="size-4 animate-spin" /> Verifying</> : <><ShieldCheck className="size-4" /> Verify email</>}</Button><div className="text-center"><Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Go to dashboard</Link></div></div>;
}

function PasswordField({ name, label }: { name: string; label: string }) { return <label className="block text-sm font-semibold">{label}<div className="relative mt-2"><KeyRound className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" /><Input name={name} type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="pl-10" placeholder="At least 8 characters" /></div></label>; }
function Status({ message }: { message: { kind: "success" | "error"; text: string } }) { return <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}{message.text}</div>; }
function BackToLogin() { return <div className="mt-6 text-center"><Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft className="size-3.5" /> Back to sign in</Link></div>; }
