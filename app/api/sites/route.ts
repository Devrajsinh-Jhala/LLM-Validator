import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { listSites, query } from "@/lib/database";
import { assertSafePublicUrl } from "@/lib/scanner/security";

export const runtime = "nodejs";

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ sites: await listSites(account.organization.id), credits: account.organization.credits });
}

export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { name?: string; url?: string; frequency?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Enter a client or site name." }, { status: 400 });
  let safeUrl: URL;
  try {
    safeUrl = await assertSafePublicUrl(body.url?.trim() ?? "");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enter a valid public URL." }, { status: 400 });
  }
  safeUrl.pathname = "/";
  safeUrl.search = "";
  safeUrl.hash = "";
  const frequency = body.frequency === "manual" ? "manual" : "weekly";
  const now = new Date();
  const nextScan = frequency === "weekly" ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
  const id = randomUUID();

  try {
    await query("INSERT INTO sites (id, organization_id, name, url, frequency, next_scan_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [id, account.organization.id, name, safeUrl.href, frequency, nextScan, now.toISOString(), now.toISOString()]);
  } catch {
    return NextResponse.json({ error: "That website is already in this workspace." }, { status: 409 });
  }
  return NextResponse.json({ site: { id, name, url: safeUrl.href, frequency, next_scan_at: nextScan } }, { status: 201 });
}
