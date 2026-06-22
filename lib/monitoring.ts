import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import {
  consumeWorkspaceCredit,
  one,
  parseStoredResult,
  query,
  recordCredit,
  refundWorkspaceCredit,
  type ScanRecord,
  type SiteRecord,
} from "@/lib/database";
import { scanWebsite } from "@/lib/scanner/engine";

interface DueSite extends SiteRecord {
  organization_name: string;
  contact_email: string | null;
}

async function sendMonitoringEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "Email is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return { sent: response.ok, reason: response.ok ? undefined : `Email provider returned ${response.status}.` };
}

function meaningfulChange(previous: ScanRecord | undefined, nextScore: number, nextErrors: number) {
  if (!previous) return true;
  const previousResult = previous.result_json ? parseStoredResult(previous) : null;
  if (!previousResult) return true;
  const previousErrors = previousResult.findings.filter((finding) => finding.severity === "error").length;
  return Math.abs(previousResult.score - nextScore) >= 5 || nextErrors > previousErrors;
}

export async function runScheduledSite(site: DueSite) {
  const previous = await one<ScanRecord>("SELECT * FROM scans WHERE site_id = $1 AND status = 'completed' ORDER BY started_at DESC LIMIT 1", [site.id]);
  const creditsRemaining = await consumeWorkspaceCredit(site.organization_id);
  if (creditsRemaining === null) {
    const retryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await query("UPDATE sites SET next_scan_at = $1, updated_at = $2 WHERE id = $3 RETURNING id", [retryAt, new Date().toISOString(), site.id]);
    if (site.contact_email) await sendMonitoringEmail(site.contact_email, `${site.name}: monitoring needs scan credits`, `<p>Weekly monitoring for <strong>${site.name}</strong> is paused because the workspace has no scan credits remaining.</p>`);
    return { siteId: site.id, status: "no_credits" as const };
  }

  const scanId = randomUUID();
  const shareToken = randomBytes(18).toString("base64url");
  const startedAt = new Date().toISOString();
  try {
    await query("INSERT INTO scans (id, organization_id, site_id, status, share_token, started_at) VALUES ($1, $2, $3, 'running', $4, $5) RETURNING id", [scanId, site.organization_id, site.id, shareToken, startedAt]);
    await recordCredit(site.organization_id, -1, "scheduled_scan", scanId);
  } catch {
    await refundWorkspaceCredit(site.organization_id);
    return { siteId: site.id, status: "failed" as const, error: "The scheduled scan could not be queued." };
  }

  try {
    const result = await scanWebsite(site.url, 25);
    result.id = scanId;
    const completedAt = new Date().toISOString();
    const nextScanAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await query("UPDATE scans SET status = 'completed', score = $1, grade = $2, result_json = $3, completed_at = $4 WHERE id = $5 RETURNING id", [result.score, result.grade, JSON.stringify(result), completedAt, scanId]);
    await query("UPDATE sites SET last_scan_at = $1, next_scan_at = $2, updated_at = $3 WHERE id = $4 RETURNING id", [completedAt, nextScanAt, completedAt, site.id]);

    const errors = result.findings.filter((finding) => finding.severity === "error").length;
    if (site.contact_email && meaningfulChange(previous, result.score, errors)) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendMonitoringEmail(site.contact_email, `${site.name}: AI readiness is now ${result.score}`, `<h2>${site.name} monitoring update</h2><p>The latest readiness score is <strong>${result.score} (${result.grade})</strong>.</p><p>${errors} critical finding${errors === 1 ? "" : "s"} and ${result.findings.length} total checks were recorded.</p><p><a href="${appUrl}/reports/${shareToken}">Open the report</a></p>`);
    }
    return { siteId: site.id, scanId, status: "completed" as const, score: result.score, creditsRemaining };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The scheduled scan failed.";
    const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await query("UPDATE scans SET status = 'failed', error = $1, completed_at = $2 WHERE id = $3 RETURNING id", [message, new Date().toISOString(), scanId]);
    await query("UPDATE sites SET next_scan_at = $1, updated_at = $2 WHERE id = $3 RETURNING id", [retryAt, new Date().toISOString(), site.id]);
    await refundWorkspaceCredit(site.organization_id);
    await recordCredit(site.organization_id, 1, "failed_scan_refund", scanId);
    return { siteId: site.id, scanId, status: "failed" as const, error: message };
  }
}

export async function runDueMonitoring(limit = 5) {
  const sites = await query<DueSite>(`
    SELECT s.*, o.name AS organization_name, a.contact_email
    FROM sites s JOIN organizations o ON o.id = s.organization_id
    LEFT JOIN agency_settings a ON a.organization_id = s.organization_id
    WHERE s.frequency = 'weekly' AND s.next_scan_at IS NOT NULL AND s.next_scan_at <= $1
    ORDER BY s.next_scan_at ASC LIMIT $2
  `, [new Date().toISOString(), limit]);
  const results = [];
  for (const site of sites) results.push(await runScheduledSite(site));
  return results;
}