import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard-client";
import { currentAccount } from "@/lib/auth";

export default async function DashboardPage() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return <DashboardClient account={account} />;
}
