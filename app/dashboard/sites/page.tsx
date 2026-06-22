import { redirect } from "next/navigation";

import { SitesManager } from "@/components/sites-manager";
import { currentAccount } from "@/lib/auth";
import { listSites } from "@/lib/database";

export default async function SitesPage() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  const sites = await listSites(account.organization.id);
  return <SitesManager account={account} initialSites={sites} />;
}
