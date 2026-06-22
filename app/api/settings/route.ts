import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { one, query } from "@/lib/database";

export const runtime = "nodejs";

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const settings = await one("SELECT * FROM agency_settings WHERE organization_id = $1", [account.organization.id]);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { brandName?: string; accentColor?: string; reportFooter?: string; contactEmail?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const brandName = body.brandName?.trim() ?? "";
  const accentColor = body.accentColor?.trim() ?? "";
  const reportFooter = body.reportFooter?.trim() ?? "";
  const contactEmail = body.contactEmail?.trim().toLowerCase() ?? "";
  if (brandName.length < 2 || brandName.length > 100) return NextResponse.json({ error: "Enter a valid brand name." }, { status: 400 });
  if (!/^#[0-9a-f]{6}$/i.test(accentColor)) return NextResponse.json({ error: "Choose a six-digit hex brand color." }, { status: 400 });
  if (reportFooter.length > 160) return NextResponse.json({ error: "The report footer is too long." }, { status: 400 });
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
  await query("UPDATE agency_settings SET brand_name = $1, accent_color = $2, report_footer = $3, contact_email = $4, updated_at = $5 WHERE organization_id = $6 RETURNING organization_id", [brandName, accentColor, reportFooter || "Prepared with AgentReady", contactEmail || null, new Date().toISOString(), account.organization.id]);
  return NextResponse.json({ ok: true });
}
