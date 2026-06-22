import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { issueAccountToken } from "@/lib/account-tokens";
import { createSessionToken, hashPassword, sessionCookieOptions } from "@/lib/auth";
import { appUrl, emailDeliveryConfigured, escapeHtml, sendProductEmail } from "@/lib/email";
import { getUserByEmail, query, transientDatabaseError } from "@/lib/database";

export const runtime = "nodejs";

function slugify(value: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "agency";
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string; agency?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const agency = body.agency?.trim() || `${name}'s workspace`;
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
  if (agency.length > 100) return NextResponse.json({ error: "The agency name is too long." }, { status: 400 });
  try {
    if (await getUserByEmail(email)) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  } catch (error) {
    return NextResponse.json(
      { error: transientDatabaseError(error) ? "The database is taking too long to respond. Please try again in a moment." : "The account service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const userId = randomUUID();
  const organizationId = randomUUID();
  const now = new Date().toISOString();
  const passwordData = hashPassword(password);
  try {
    await query("INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [userId, email, name, passwordData.hash, passwordData.salt, now]);
    await query("INSERT INTO organizations (id, name, slug, credits_remaining, created_at) VALUES ($1, $2, $3, 3, $4) RETURNING id", [organizationId, agency, slugify(agency), now]);
    await query("INSERT INTO memberships (user_id, organization_id, role, created_at) VALUES ($1, $2, 'owner', $3) RETURNING user_id", [userId, organizationId, now]);
    await query("INSERT INTO agency_settings (organization_id, brand_name, contact_email, updated_at) VALUES ($1, $2, $3, $4) RETURNING organization_id", [organizationId, agency, email, now]);
    await query("INSERT INTO credit_transactions (id, organization_id, amount, reason, scan_id, created_at) VALUES ($1, $2, 3, 'signup_bonus', NULL, $3) RETURNING id", [randomUUID(), organizationId, now]);
  } catch (error) {
    try { await query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]); } catch { /* Best-effort cleanup. */ }
    try { await query("DELETE FROM organizations WHERE id = $1 RETURNING id", [organizationId]); } catch { /* Best-effort cleanup. */ }
    return NextResponse.json({ error: transientDatabaseError(error) ? "The database connection was interrupted. Please try creating the workspace again." : "The account could not be created." }, { status: transientDatabaseError(error) ? 503 : 500 });
  }

  let verificationSent = false;
  if (emailDeliveryConfigured()) {
    try {
      const token = await issueAccountToken(userId, "email_verification", 24 * 60);
      const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
      const delivery = await sendProductEmail(
        email,
        "Verify your AgentReady email",
        `<h2>Welcome to AgentReady, ${escapeHtml(name)}</h2><p>Confirm your email to secure your workspace and receive monitoring alerts.</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      );
      verificationSent = delivery.sent;
    } catch { /* Registration should still succeed if email delivery is unavailable. */ }
  }

  const response = NextResponse.json({ ok: true, verificationSent, user: { id: userId, name, email }, organization: { id: organizationId, name: agency, credits: 3 } }, { status: 201 });
  const cookie = sessionCookieOptions();
  response.cookies.set(cookie.name, createSessionToken(userId), cookie);
  return response;
}


