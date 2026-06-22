import { NextResponse } from "next/server";

import { consumeAccountToken } from "@/lib/account-tokens";
import { query } from "@/lib/database";

export async function POST(request: Request) {
  let body: { token?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  const record = await consumeAccountToken(body.token ?? "", "email_verification");
  if (!record) return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  await query("UPDATE users SET email_verified_at = $1 WHERE id = $2 RETURNING id", [new Date().toISOString(), record.user_id]);
  return NextResponse.json({ ok: true });
}
