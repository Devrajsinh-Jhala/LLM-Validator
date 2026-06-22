import { notFound, redirect } from "next/navigation";

import { ReportView } from "@/components/report-view";
import { currentAccount } from "@/lib/auth";
import { getScan, one, parseStoredResult } from "@/lib/database";
import { refreshScanResult } from "@/lib/scanner/engine";

export default async function PrivateReportPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  const { id } = await params;
  const scan = await getScan(id, account.organization.id);
  if (!scan || scan.status !== "completed") notFound();
  const storedResult = parseStoredResult(scan);
  if (!storedResult) notFound();
  const result = refreshScanResult(storedResult);
  const settings = await one<{ brand_name: string; accent_color: string; report_footer: string; contact_email: string | null }>("SELECT * FROM agency_settings WHERE organization_id = $1", [account.organization.id]);
  return <ReportView result={result} shareToken={scan.share_token} branding={{ brandName: settings?.brand_name || account.organization.name, accentColor: settings?.accent_color || "#0f766e", footer: settings?.report_footer || "Prepared with AgentReady", contactEmail: settings?.contact_email }} />;
}


