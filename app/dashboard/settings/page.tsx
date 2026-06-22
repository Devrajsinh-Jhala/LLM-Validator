import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsForm } from "@/components/settings-form";
import { currentAccount } from "@/lib/auth";
import { one } from "@/lib/database";

export default async function SettingsPage() {
  const account = await currentAccount(); if (!account) redirect("/login");
  const settings = await one<{ brand_name: string; accent_color: string; report_footer: string; contact_email: string | null }>("SELECT * FROM agency_settings WHERE organization_id = $1", [account.organization.id]);
  return <DashboardShell account={account}><SettingsForm settings={settings} /></DashboardShell>;
}
