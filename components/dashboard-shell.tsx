"use client";

import { ReactNode, useState } from "react";
import { Activity, Coins, FileText, Globe2, LayoutDashboard, LogOut, Mail, Menu, Radar, Settings2, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SALES_EMAIL = "jhaladevrajsinh11@gmail.com";
const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/sites", label: "Client sites", icon: Globe2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: Activity },
];

export interface DashboardAccount {
  user: { id?: string; name: string; email: string; emailVerified?: boolean };
  organization: { id?: string; name: string; credits: number };
}

export function DashboardShell({ account, children }: { account: DashboardAccount; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  async function resendVerification() {
    setVerificationMessage("Sending…");
    const response = await fetch("/api/auth/verification/request", { method: "POST" });
    const payload = await response.json() as { error?: string };
    setVerificationMessage(response.ok ? "Verification email sent." : payload.error || "Could not send verification email.");
  }

  const sidebar = <>
    <Link href="/" className="flex items-center gap-2.5 px-2 py-2 font-bold tracking-tight" onClick={() => setMenuOpen(false)}><span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white"><Radar className="size-[19px]" /></span>AgentReady</Link>
    <nav className="mt-8 space-y-1 text-sm font-medium">{navigation.map(({ href, label, icon: Icon, exact }) => { const active = exact ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950")}><Icon className="size-4" />{label}</Link>; })}</nav>
    <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Workspace</div>
    <div className="mt-2 rounded-xl border bg-slate-50 p-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-teal-100 text-xs font-bold text-teal-800">{account.organization.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-bold">{account.organization.name}</p><p className="truncate text-[10px] text-slate-400">Agency workspace</p></div></div></div>
    <div className="mt-auto space-y-1 text-sm font-medium"><a href={`mailto:${SALES_EMAIL}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-950"><Mail className="size-4" />Contact support</a><Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", pathname.startsWith("/dashboard/settings") ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950")}><Settings2 className="size-4" />Settings</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-950"><LogOut className="size-4" />Sign out</button></div>
  </>;

  return <div className="min-h-screen bg-slate-50/80 text-slate-950"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white p-4 lg:flex lg:flex-col">{sidebar}</aside>{menuOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMenuOpen(false)} /><aside className="relative flex h-full w-[min(86vw,320px)] flex-col border-r bg-white p-4 shadow-2xl"><button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="absolute right-4 top-5 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>{sidebar}</aside></div> : null}<div className="lg:pl-64"><header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl"><div className="flex h-[72px] items-center justify-between px-4 sm:px-8"><div className="flex items-center gap-3"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button><div><p className="max-w-[150px] truncate text-xs font-medium text-slate-400 sm:max-w-none">{account.organization.name}</p><h1 className="text-sm font-bold sm:text-base">AI readiness workspace</h1></div></div><div className="flex items-center gap-2"><Badge variant={account.organization.credits > 0 ? "success" : "warning"} className="gap-1.5"><Coins className="size-3.5" /> {account.organization.credits}</Badge><Button variant="outline" size="sm" asChild className="hidden sm:inline-flex"><a href={`mailto:${SALES_EMAIL}?subject=AgentReady%20credits`}><Mail className="size-3.5" /> Get credits</a></Button><span className="ml-1 grid size-9 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">{account.user.name.slice(0, 2).toUpperCase()}</span></div></div>{account.user.emailVerified === false ? <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><ShieldAlert className="size-4" />Verify your email to secure recovery and monitoring alerts.</span><button onClick={resendVerification} className="font-bold underline underline-offset-2">{verificationMessage || "Send verification email"}</button></div></div> : null}</header>{children}</div></div>;
}
