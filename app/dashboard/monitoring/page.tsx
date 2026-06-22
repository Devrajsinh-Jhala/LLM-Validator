import { redirect } from "next/navigation";

import { MonitoringManager } from "@/components/monitoring-manager";
import { currentAccount } from "@/lib/auth";
import { listSites } from "@/lib/database";

export default async function MonitoringPage() {
  const account = await currentAccount(); if (!account) redirect("/login");
  return <MonitoringManager account={account} initialSites={await listSites(account.organization.id)} />;
}
