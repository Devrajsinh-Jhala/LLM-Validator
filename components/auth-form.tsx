"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, LockKeyhole, Mail, Radar, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const responseText = await response.text();
      let payload: { ok?: boolean; error?: string } = {};
      if (responseText) {
        try { payload = JSON.parse(responseText) as typeof payload; }
        catch { throw new Error("The server returned an invalid response. Please try again."); }
      }
      if (!response.ok) throw new Error(payload.error || "The account service is temporarily unavailable. Please try again.");
      if (!responseText) throw new Error("The server returned an empty response. Please try again.");
      router.push("/dashboard");
      router.refresh();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
      setLoading(false);
    }
  }

  const register = mode === "register";
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-center lg:min-h-[calc(100vh-5rem)]">
        <div className="grid w-full overflow-hidden rounded-[28px] border bg-white shadow-soft lg:grid-cols-[.9fr_1.1fr]">
          <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-teal-400/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
            <Link href="/" className="relative flex items-center gap-2.5 font-bold">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-slate-950"><Radar className="size-[19px]" /></span>
              AgentReady
            </Link>
            <div className="relative">
              <p className="text-3xl font-bold leading-tight tracking-[-0.04em]">Every client site, measured and monitored.</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">Move from one-off llms.txt files to an evidence-based AI readiness service.</p>
              <div className="mt-8 space-y-3 text-sm text-slate-300">
                {["Secure public-site crawling", "3 free credits, saved scans, and reports", "Agency-ready share links"].map((item) => (
                  <div key={item} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-teal-300" />{item}</div>
                ))}
              </div>
            </div>
            <p className="relative text-xs text-slate-500">No payment gateway. Access is managed directly.</p>
          </div>

          <div className="p-6 sm:p-10 lg:p-14">
            <Link href="/" className="mb-10 flex items-center gap-2.5 font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white"><Radar className="size-[19px]" /></span>AgentReady</Link>
            <div className="max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{register ? "Create workspace" : "Welcome back"}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">{register ? "Start monitoring client sites" : "Sign in to your workspace"}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{register ? "Set up your agency workspace with 3 free scan credits—no card required." : "Continue reviewing reports and monitoring changes."}</p>

              <form method="post" onSubmit={submit} className="mt-8 space-y-4">
                {register ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={UserRound} label="Your name" name="name" placeholder="Dev Jhala" autoComplete="name" />
                    <Field icon={Radar} label="Agency name" name="agency" placeholder="Northstar SEO" autoComplete="organization" />
                  </div>
                ) : null}
                <Field icon={Mail} label="Email address" name="email" type="email" placeholder="you@agency.com" autoComplete="email" />
                <Field icon={LockKeyhole} label="Password" name="password" type="password" placeholder="At least 8 characters" autoComplete={register ? "new-password" : "current-password"} />
                {!register ? <div className="-mt-1 text-right"><Link href="/forgot-password" className="text-xs font-semibold text-teal-700 hover:underline">Forgot password?</Link></div> : null}
                {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="size-4 animate-spin" /> Please wait</> : <>{register ? "Create workspace" : "Sign in"}<ArrowRight className="size-4" /></>}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                {register ? "Already have an account?" : "New to AgentReady?"}{" "}
                <Link className="font-semibold text-slate-950 hover:underline" href={register ? "/login" : "/register"}>{register ? "Sign in" : "Create a workspace"}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }: { icon: typeof Mail; label: string; name: string; type?: string; placeholder: string; autoComplete: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
        <Input className="pl-10" required {...props} />
      </div>
    </label>
  );
}



