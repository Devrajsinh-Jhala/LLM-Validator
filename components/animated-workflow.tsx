"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileCheck2, Globe2, Radar, ScanSearch, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SALES_LINK = "mailto:jhaladevrajsinh11@gmail.com?subject=AgentReady%20agency%20access";

const workflow = [
  {
    icon: Globe2,
    number: "01",
    title: "Add a public website",
    body: "AgentReady discovers the sitemap, robots policy, existing llms.txt, and priority content.",
    signal: "84 pages discovered",
    detail: "Public crawl",
  },
  {
    icon: ScanSearch,
    number: "02",
    title: "Analyze the AI signal",
    body: "Metadata, structure, context consumption, and llms.txt compliance become evidence-based findings.",
    signal: "6 findings prioritized",
    detail: "Live analysis",
  },
  {
    icon: FileCheck2,
    number: "03",
    title: "Export and monitor",
    body: "Download the generated file, share a branded report, and keep the site healthy with recurring scans.",
    signal: "Report ready to share",
    detail: "Client ready",
  },
];

export function AnimatedWorkflow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % workflow.length), 2400);
    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <section ref={sectionRef} id="workflow" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="container grid gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
        <div>
          <Badge variant="secondary" className="mb-4 gap-2"><Sparkles className="size-3.5 text-teal-700" /> Animated workflow</Badge>
          <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-5xl">From a URL to a client-ready report.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">Watch the same three-step loop your team uses: discover, analyze, then turn the findings into something useful.</p>
          <div className="mt-8 flex flex-col gap-2">
            {workflow.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-500",
                  active === index ? "border-slate-900 bg-white shadow-soft" : "border-transparent text-slate-500 hover:bg-slate-50",
                )}
                aria-pressed={active === index}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold transition-colors", active === index ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500")}>{step.number}</span>
                <span><span className="block text-sm font-bold text-slate-950">{step.title}</span><span className={cn("mt-1 block overflow-hidden text-xs leading-5 transition-all duration-500", active === index ? "max-h-16 opacity-100" : "max-h-0 opacity-0")}>{step.body}</span></span>
              </button>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-7"><a href={SALES_LINK}>Book an agency walkthrough <ArrowRight className="size-4" /></a></Button>
        </div>

        <div className="relative rounded-[28px] border border-slate-200 bg-slate-950 p-4 shadow-soft sm:p-7">
          <div className="absolute -right-20 -top-20 size-56 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative flex items-center justify-between border-b border-white/10 pb-4 text-white">
            <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-white text-slate-950"><Radar className="size-4" /></span><div><p className="text-xs font-bold">Live readiness pipeline</p><p className="text-[10px] text-slate-400">One scan credit per run</p></div></div>
            <Badge className="border-teal-400/20 bg-teal-400/10 text-teal-200"><span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-teal-300" />Processing</Badge>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-white/10 sm:block">
              <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-400 transition-all duration-700" style={{ width: `${active * 50 + 12}%` }} />
            </div>
            {workflow.map((step, index) => {
              const Icon = step.icon;
              const complete = index < active;
              const current = index === active;
              return (
                <div key={step.number} className={cn("relative z-10 rounded-2xl border p-4 transition-all duration-500", current ? "-translate-y-1 border-teal-400/50 bg-white/[0.09] shadow-[0_12px_35px_rgba(45,212,191,.12)]" : "border-white/10 bg-white/[0.04]")}>
                  <span className={cn("grid size-10 place-items-center rounded-xl transition-all duration-500", current ? "scale-110 bg-teal-300 text-slate-950" : complete ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.07] text-slate-400")}>{complete ? <CheckCircle2 className="size-5" /> : <Icon className={cn("size-5", current && "animate-pulse")} />}</span>
                  <p className="mt-5 text-xs font-bold text-white">{step.title}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{step.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <div className="absolute inset-y-0 left-0 w-1 bg-teal-300 transition-transform duration-500" style={{ transform: `translateY(${active * 0}px)` }} />
            <div key={active} className="animate-[float_.55s_ease-out_1]">
              <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Current output</p><span className="text-[10px] font-semibold text-teal-300">Step {active + 1} of 3</span></div>
              <p className="mt-2 text-lg font-bold text-white" aria-live="polite">{workflow[active].signal}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-indigo-400 transition-all duration-700" style={{ width: `${(active + 1) * 33.333}%` }} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
