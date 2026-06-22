import { notFound } from "next/navigation";

import { ReportView } from "@/components/report-view";
import { getScanByShareToken, one, parseStoredResult } from "@/lib/database";
import { refreshScanResult } from "@/lib/scanner/engine";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const scan = await getScanByShareToken(token);
  if (!scan) notFound();
  const storedResult = parseStoredResult(scan);
  if (!storedResult) notFound();
  const result = refreshScanResult(storedResult);
  const settings = await one<{ brand_name: string; accent_color: string; report_footer: string; contact_email: string | null }>("SELECT * FROM agency_settings WHERE organization_id = $1", [scan.organization_id]);
  return <ReportView publicView result={result} branding={{ brandName: settings?.brand_name || "Agency report", accentColor: settings?.accent_color || "#0f766e", footer: settings?.report_footer || "Prepared with AgentReady", contactEmail: settings?.contact_email }} />;
}


