import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { getSite, one, query } from "@/lib/database";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const site = await getSite(id, account.organization.id);
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  let body: { name?: string; frequency?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  const name = body.name === undefined ? site.name : body.name.trim();
  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Enter a valid site name." }, { status: 400 });
  const frequency = body.frequency === undefined ? site.frequency : body.frequency === "manual" ? "manual" : body.frequency === "weekly" ? "weekly" : null;
  if (!frequency) return NextResponse.json({ error: "Choose manual or weekly monitoring." }, { status: 400 });
  const nextScanAt = frequency === "manual" ? null : site.frequency === "weekly" && site.next_scan_at ? site.next_scan_at : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const updated = await one("UPDATE sites SET name = $1, frequency = $2, next_scan_at = $3, updated_at = $4 WHERE id = $5 AND organization_id = $6 RETURNING *", [name, frequency, nextScanAt, new Date().toISOString(), id, account.organization.id]);
  return NextResponse.json({ site: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const site = await getSite(id, account.organization.id);
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const running = await one("SELECT id FROM scans WHERE site_id = $1 AND status = 'running' LIMIT 1", [id]);
  if (running) return NextResponse.json({ error: "Wait for the active scan to finish before deleting this site." }, { status: 409 });
  await query("DELETE FROM sites WHERE id = $1 AND organization_id = $2 RETURNING id", [id, account.organization.id]);
  return NextResponse.json({ ok: true });
}
