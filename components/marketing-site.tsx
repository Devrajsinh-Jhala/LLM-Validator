"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  FileCheck2,
  FileText,
  Gauge,
  Globe2,
  Layers3,
  Mail,
  Menu,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users2,
  WandSparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RealScannerPreview } from "@/components/real-scanner-preview";
import { AnimatedWorkflow } from "@/components/animated-workflow";
import { cn } from "@/lib/utils";

const SALES_EMAIL = "jhaladevrajsinh11@gmail.com";
const SALES_LINK = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
  "AgentReady agency access",
)}&body=${encodeURIComponent(
  "Hi Devrajsinh,\n\nIâ€™d like to learn more about using AgentReady for our websites.\n\nAgency/company:\nNumber of sites:\nMain goal:\n",
)}`;

const features = [
  {
    icon: ScanSearch,
    title: "Crawl with intent",
    body: "Find the pages that actually explain a businessâ€”not every forgotten tag archive and campaign URL.",
    color: "bg-teal-50 text-teal-700",
  },
  {
    icon: FileCheck2,
    title: "Generate clean llms.txt",
    body: "Turn scattered site content into a concise, standards-aware map that teams can review before publishing.",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: Gauge,
    title: "See context limits",
    body: "Know what fits at 8K, 32K, and 128Kâ€”and exactly which useful pages fall beyond the cutoff.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Activity,
    title: "Monitor every week",
    body: "Get notified when important pages disappear, links break, or a clientâ€™s AI-ready footprint quietly changes.",
    color: "bg-rose-50 text-rose-700",
  },
  {
    icon: Users2,
    title: "Built for agencies",
    body: "Keep every client organized, share branded reports, and turn technical findings into an easy next action.",
    color: "bg-sky-50 text-sky-700",
  },
  {
    icon: ShieldCheck,
    title: "Evidence, not hype",
    body: "Every score links to a rule and source. No promises of guaranteed AI rankings or mystery optimization theater.",
    color: "bg-emerald-50 text-emerald-700",
  },
];

const findings = [
  {
    icon: CheckCircle2,
    tone: "text-emerald-600 bg-emerald-50",
    label: "Passed",
    title: "llms.txt found at root",
    detail: "Valid UTF-8 and reachable in 184 ms",
  },
  {
    icon: AlertTriangle,
    tone: "text-amber-700 bg-amber-50",
    label: "Warning",
    title: "3 key pages exceed 32K",
    detail: "Move secondary resources to Optional",
  },
  {
    icon: CircleDot,
    tone: "text-indigo-700 bg-indigo-50",
    label: "Improve",
    title: "Descriptions are too generic",
    detail: "11 links need clearer retrieval context",
  },
];

function Logo() {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label="AgentReady home">
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-[14px] bg-slate-950 text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        <Radar className="size-5" strokeWidth={2.2} />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-slate-950 bg-teal-300" />
      </span>
      <span className="text-lg font-bold tracking-[-0.035em]">AgentReady</span>
    </a>
  );
}

function ContactButton({
  variant = "default",
  size = "default",
  className,
  children = "Contact sales",
}: {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={SALES_LINK}>
        {children}
        <ArrowRight className="size-4" />
      </a>
    </Button>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const links = [
    ["Product", "#product"],
    ["How it works", "#workflow"],
    ["For agencies", "#agencies"],
    ["Access", "#access"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_1px_12px_rgba(15,23,42,0.035)] backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1 text-sm font-semibold text-slate-600 lg:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="rounded-xl px-3.5 py-2 transition-all hover:bg-white hover:text-slate-950 hover:shadow-sm">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 lg:flex">
          <Button asChild variant="ghost" size="sm" className="rounded-xl px-4 font-semibold">
            <a href="/login">Sign in</a>
          </Button>
          <ContactButton size="sm" className="h-10 rounded-xl px-5 shadow-lg shadow-slate-950/10" />
        </div>
        <Button
          className="rounded-xl lg:hidden"
          variant="outline"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-slate-200/70 bg-white/95 px-5 py-4 shadow-lg lg:hidden">
          <nav className="mx-auto flex max-w-lg flex-col gap-1 text-sm font-semibold text-slate-700">
            {[...links, ["Sign in", "/login"]].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 hover:text-slate-950">{label}</a>
            ))}
            <ContactButton className="mt-3 w-full rounded-xl" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
function DashboardPreview() {
  const [active, setActive] = useState<"overview" | "findings">("overview");

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-soft">
      <div className="flex h-14 items-center justify-between border-b px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-slate-950 text-white"><Radar className="size-4" /></span>
          <span className="text-sm font-bold">AgentReady</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">Northstar Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:flex"><Clock3 className="size-3.5" /> Updated 4m ago</span>
          <Badge variant="success">Healthy</Badge>
        </div>
      </div>
      <div className="grid min-h-[520px] md:grid-cols-[180px_1fr]">
        <aside className="hidden border-r bg-slate-50/70 p-3 md:block">
          <div className="mb-5 px-2 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Workspace</div>
          <div className="space-y-1 text-xs font-medium">
            {[
              [BarChart3, "Overview", true],
              [Globe2, "Client sites", false],
              [FileText, "Reports", false],
              [Activity, "Monitoring", false],
            ].map(([Icon, label, selected]) => {
              const ItemIcon = Icon as typeof BarChart3;
              return (
                <div key={String(label)} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2", selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}>
                  <ItemIcon className="size-4" /> {String(label)}
                </div>
              );
            })}
          </div>
          <div className="mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Clients</div>
          <div className="space-y-1.5">
            {["Northstar", "Arc Labs", "Luma Health"].map((client, index) => (
              <div key={client} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600">
                <span className={cn("size-2 rounded-full", ["bg-teal-400", "bg-indigo-400", "bg-amber-400"][index])} /> {client}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 bg-slate-50/30 p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold text-teal-700">northstar.studio</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight">AI readiness report</h3>
            </div>
            <div className="flex rounded-lg border bg-white p-1 text-xs font-semibold shadow-sm">
              <button onClick={() => setActive("overview")} className={cn("rounded-md px-3 py-1.5", active === "overview" ? "bg-slate-950 text-white" : "text-slate-500")}>Overview</button>
              <button onClick={() => setActive("findings")} className={cn("rounded-md px-3 py-1.5", active === "findings" ? "bg-slate-950 text-white" : "text-slate-500")}>Findings</button>
            </div>
          </div>

          {active === "overview" ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Readiness score", "84", "+6 this month"],
                  ["Pages analyzed", "84", "7 priority pages"],
                  ["Context estimate", "31.2K", "Fits 32K with edits"],
                ].map(([label, value, note], index) => (
                  <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-medium text-slate-500">{label}</div>
                    <div className="mt-2 flex items-baseline justify-between gap-2"><span className="text-2xl font-bold tracking-tight">{value}</span>{index === 0 ? <span className="text-xs font-semibold text-emerald-600">â†‘ 8%</span> : null}</div>
                    <div className="mt-2 text-[10px] text-slate-400">{note}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between"><div><h4 className="text-sm font-bold">Context coverage</h4><p className="mt-1 text-[11px] text-slate-400">What an agent can retrieve by window size</p></div><Badge variant="outline">Estimated</Badge></div>
                  <div className="mt-5 space-y-4">
                    {[
                      ["8K", 31, "Core pages"],
                      ["32K", 78, "Recommended"],
                      ["128K", 100, "Full coverage"],
                    ].map(([size, value, label], index) => (
                      <div key={String(size)} className="grid grid-cols-[38px_1fr_64px] items-center gap-3 text-[11px]">
                        <span className="font-bold">{size}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", index === 1 ? "bg-teal-500" : "bg-slate-800")} style={{ width: `${value}%` }} /></div>
                        <span className="text-right text-slate-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-bold">Latest findings</h4><span className="text-[11px] font-semibold text-teal-700">View all</span></div>
                  <div className="mt-3 space-y-2.5">
                    {findings.slice(0, 3).map((finding) => (
                      <div key={finding.title} className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-2.5">
                        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md", finding.tone)}><finding.icon className="size-3.5" /></span>
                        <div className="min-w-0"><p className="truncate text-[11px] font-bold">{finding.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{finding.detail}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><div><h4 className="text-sm font-bold">Prioritized findings</h4><p className="mt-1 text-[11px] text-slate-400">Each issue includes evidence and a practical fix.</p></div><Badge variant="warning">6 open</Badge></div>
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div key={finding.title} className="flex items-start gap-3 rounded-xl border p-3.5">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", finding.tone)}><finding.icon className="size-4" /></span>
                    <div className="flex-1"><div className="flex items-center gap-2"><p className="text-xs font-bold">{finding.title}</p><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{finding.label}</span></div><p className="mt-1 text-[11px] text-slate-500">{finding.detail}</p></div>
                    <ChevronRight className="mt-2 size-4 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketingSite() {
  return (
    <main id="top" className="overflow-hidden">
      <Header />

      <section className="relative border-b border-slate-100 pb-24 pt-16 sm:pt-24 lg:pb-32 lg:pt-28">
        <div className="grid-fade absolute inset-0 -z-20" />
        <div className="noise absolute inset-0 -z-10 opacity-40" />
        <div className="absolute left-[-12rem] top-[-10rem] -z-10 size-[30rem] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="container grid items-center gap-14 lg:grid-cols-[1fr_.95fr] lg:gap-16">
          <div className="text-center lg:text-left">
            <Badge variant="outline" className="mb-6 gap-2 border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
              <Sparkles className="size-3.5 text-teal-600" /> AI readiness, made measurable
            </Badge>
            <h1 className="text-balance text-[44px] font-bold leading-[1.04] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[68px]">
              Make every client site legible to AI.
            </h1>
            <p className="text-balance mx-auto mt-6 max-w-[620px] text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">
              Generate, validate, and monitor <span className="font-semibold text-slate-900">llms.txt</span>â€”with transparent context budgets and reports your clients can actually understand.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a href="#product"><Button size="lg" className="w-full sm:w-auto">Explore the product <ArrowRight className="size-4" /></Button></a>
              <ContactButton variant="outline" size="lg" className="w-full bg-white/70 sm:w-auto" />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500 lg:justify-start">
              {["No credit card", "Evidence-based scoring", "Built for agencies"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="size-3.5 text-teal-600" />{item}</span>)}
            </div>
          </div>
          <RealScannerPreview />
        </div>
      </section>

      <section className="border-b bg-white py-8">
        <div className="container flex flex-col items-center justify-between gap-6 lg:flex-row">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400 lg:text-left">One clear workflow for</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-500 sm:gap-x-12">
            {["SEO agencies", "Content teams", "SaaS docs", "Technical marketers"].map((name, index) => (
              <span key={name} className="flex items-center gap-2"><span className={cn("grid size-6 place-items-center rounded-md", ["bg-teal-50 text-teal-700", "bg-indigo-50 text-indigo-700", "bg-amber-50 text-amber-700", "bg-sky-50 text-sky-700"][index])}>{[<Layers3 key="a" className="size-3.5" />, <FileText key="b" className="size-3.5" />, <Code2 key="c" className="size-3.5" />, <BarChart3 key="d" className="size-3.5" />][index]}</span>{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="py-24 sm:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">The full signal</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-5xl">From â€œwe added a fileâ€ to a system you can manage.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600">AgentReady turns a fuzzy new standard into a repeatable agency serviceâ€”with traceable recommendations and visible progress.</p>
          </div>
          <div className="mt-14"><DashboardPreview /></div>
        </div>
      </section>

      <section className="border-y bg-slate-50/70 py-24 sm:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 bg-white">Everything that matters</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Useful on day one. More valuable every week.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group border-slate-200 bg-white p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <CardContent className="p-6 sm:p-7">
                  <span className={cn("grid size-11 place-items-center rounded-xl transition-transform group-hover:scale-105", feature.color)}><feature.icon className="size-5" /></span>
                  <h3 className="mt-5 text-[17px] font-bold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{feature.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <AnimatedWorkflow />

      <section id="agencies" className="container pb-24 sm:pb-32">
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-12 text-white shadow-soft sm:px-10 sm:py-16 lg:px-16">
          <div className="absolute right-[-8rem] top-[-12rem] size-[30rem] rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute bottom-[-18rem] left-[20%] size-[32rem] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_.85fr] lg:items-center">
            <div>
              <Badge className="mb-5 border-white/10 bg-white/10 text-white">For modern SEO agencies</Badge>
              <h2 className="text-balance text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Turn AI readiness into a service clients can see.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Bring every site into one workspace, attach your brand to the report, and make next monthâ€™s progress obvious.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ContactButton size="lg" className="bg-white text-slate-950 hover:bg-slate-100">Request agency access</ContactButton>
                <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><a href={`mailto:${SALES_EMAIL}`}><Mail className="size-4" /> Email directly</a></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [Users2, "Multi-client workspace"],
                [WandSparkles, "White-label reports"],
                [Activity, "Scheduled monitoring"],
                [FileText, "Export-ready files"],
              ].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof Users2;
                return <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"><ItemIcon className="size-5 text-teal-300" /><p className="mt-3 text-sm font-semibold">{String(label)}</p></div>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="access" className="border-y bg-white py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="success" className="mb-4">Founding access</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Letâ€™s see if it fits your agency.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">No checkout maze. Tell us how many sites you manage and what you want to improve. Weâ€™ll reply personally with access, scope, and pricing.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ContactButton size="lg">Contact sales by email</ContactButton>
              <Button asChild variant="outline" size="lg"><a href={`mailto:${SALES_EMAIL}`}><Mail className="size-4" /> {SALES_EMAIL}</a></Button>
            </div>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {["Personal onboarding", "Agency-first terms", "Direct founder support"].map((item) => <div key={item} className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600"><CheckCircle2 className="size-4 text-teal-600" />{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 py-10">
        <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div><Logo /><p className="mt-3 text-xs text-slate-400">AI readiness without the hand-waving.</p></div>
          <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-slate-500">
            <a href="#product" className="hover:text-slate-950">Product</a>
            <a href="#workflow" className="hover:text-slate-950">How it works</a>
            <a href={SALES_LINK} className="hover:text-slate-950">Contact</a>
          </div>
          <p className="text-xs text-slate-400">Â© {new Date().getFullYear()} AgentReady</p>
        </div>
      </footer>
    </main>
  );
}
