import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { consumeGuestCredit, query } from "@/lib/database";
import { scanWebsite } from "@/lib/scanner/engine";
import { assertSafePublicUrl } from "@/lib/scanner/security";

export const runtime = "nodejs";
export const maxDuration = 60;

function fingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  const agent = request.headers.get("user-agent") || "unknown";
  const secret = process.env.SESSION_SECRET || "agentready-development-guest-secret";
  return createHmac("sha256", secret).update(`${ip}:${agent}`).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }

  const url = typeof body === "object" && body !== null && "url" in body ? String(body.url) : "";
  if (!url || url.length > 2048) return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 });
  try { await assertSafePublicUrl(url); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Enter a valid public URL." }, { status: 422 }); }

  const guestFingerprint = fingerprint(request);
  const credit = await consumeGuestCredit(guestFingerprint);
  if (!credit) {
    return NextResponse.json({
      error: "Your free guest scan has been used. Create a workspace for 3 more scan credits or contact sales.",
      code: "GUEST_CREDIT_USED",
    }, { status: 402 });
  }

  try {
    const result = await scanWebsite(url, 25);
    return NextResponse.json({ result, guestCreditsRemaining: 0, resetAt: credit.reset_at });
  } catch (error) {
    await query("UPDATE guest_scan_limits SET used_count = 0 WHERE fingerprint = $1 RETURNING fingerprint", [guestFingerprint]);
    const message = error instanceof Error ? error.message : "The website could not be scanned.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}