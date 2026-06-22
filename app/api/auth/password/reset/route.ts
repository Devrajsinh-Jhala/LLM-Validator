import { NextResponse } from "next/server";

import { consumeAccountToken } from "@/lib/account-tokens";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/database";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  const password = body.password ?? "";
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
  }
  const record = await consumeAccountToken(body.token ?? "", "password_reset");
  if (!record) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  const passwordData = hashPassword(password);
  await query("UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3 RETURNING id", [passwordData.hash, passwordData.salt, record.user_id]);
  return NextResponse.json({ ok: true });
}
