import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { consumeWorkspaceCredit, getSite, one, query, recordCredit, refundWorkspaceCredit } from "@/lib/database";
import { scanWebsite } from "@/lib/scanner/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id: siteId } = await context.params;
  const site = await getSite(siteId, account.organization.id);
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const existing = await one<{ id: string }>("SELECT id FROM scans WHERE site_id = $1 AND status = 'running' LIMIT 1", [siteId]);
  if (existing) return NextResponse.json({ error: "A scan is already running for this site." }, { status: 409 });

  const creditsRemaining = await consumeWorkspaceCredit(account.organization.id);
  if (creditsRemaining === null) {
    return NextResponse.json({ error: "Your free scan credits are finished. Contact sales to add more credits.", code: "NO_CREDITS" }, { status: 402 });
  }

  const scanId = randomUUID();
  const shareToken = randomBytes(18).toString("base64url");
  const startedAt = new Date().toISOString();
  try {
    await query("INSERT INTO scans (id, organization_id, site_id, status, share_token, started_at) VALUES ($1, $2, $3, 'running', $4, $5) RETURNING id", [scanId, account.organization.id, siteId, shareToken, startedAt]);
    await recordCredit(account.organization.id, -1, "manual_scan", scanId);
  } catch {
    await refundWorkspaceCredit(account.organization.id);
    return NextResponse.json({ error: "The scan could not be queued." }, { status: 500 });
  }

  try {
    const result = await scanWebsite(site.url, 25);
    result.id = scanId;
    const completedAt = new Date().toISOString();
    await query("UPDATE scans SET status = 'completed', score = $1, grade = $2, result_json = $3, completed_at = $4 WHERE id = $5 RETURNING id", [result.score, result.grade, JSON.stringify(result), completedAt, scanId]);
    const nextScan = site.frequency === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    await query("UPDATE sites SET last_scan_at = $1, next_scan_at = $2, updated_at = $3 WHERE id = $4 RETURNING id", [completedAt, nextScan, completedAt, siteId]);
    return NextResponse.json({ scan: { id: scanId, status: "completed", score: result.score, grade: result.grade, shareToken }, creditsRemaining });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The website could not be scanned.";
    await query("UPDATE scans SET status = 'failed', error = $1, completed_at = $2 WHERE id = $3 RETURNING id", [message, new Date().toISOString(), scanId]);
    await refundWorkspaceCredit(account.organization.id);
    await recordCredit(account.organization.id, 1, "failed_scan_refund", scanId);
    return NextResponse.json({ error: message, scanId, creditsRemaining: creditsRemaining + 1 }, { status: 422 });
  }
}