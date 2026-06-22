import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { adminAuthenticated } from "@/lib/admin-auth";
import { one, query } from "@/lib/database";

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Credit administration is not configured." }, { status: 503 });
  const bearerValid = request.headers.get("authorization") === `Bearer ${secret}`;
  if (!bearerValid && !(await adminAuthenticated())) {
    return NextResponse.json({ error: "Invalid administrator credential." }, { status: 401 });
  }

  let body: { email?: string; amount?: number; note?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase() ?? "";
  const amount = Number(body.amount);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid account email." }, { status: 400 });
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000) return NextResponse.json({ error: "Credit amount must be between 1 and 10,000." }, { status: 400 });

  const account = await one<{ organization_id: string }>(`
    SELECT m.organization_id FROM users u JOIN memberships m ON m.user_id = u.id
    WHERE u.email = $1 LIMIT 1
  `, [email]);
  if (!account) return NextResponse.json({ error: "No workspace exists for that email." }, { status: 404 });
  const updated = await one<{ credits_remaining: number }>(
    "UPDATE organizations SET credits_remaining = credits_remaining + $1 WHERE id = $2 RETURNING credits_remaining",
    [amount, account.organization_id],
  );
  await query(
    "INSERT INTO credit_transactions (id, organization_id, amount, reason, scan_id, created_at) VALUES ($1, $2, $3, $4, NULL, $5) RETURNING id",
    [randomUUID(), account.organization_id, amount, `manual_topup:${(body.note || "sales").slice(0, 80)}`, new Date().toISOString()],
  );
  return NextResponse.json({ ok: true, email, credits: updated.credits_remaining });
}

