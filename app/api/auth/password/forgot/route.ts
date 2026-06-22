import { NextResponse } from "next/server";

import { issueAccountToken } from "@/lib/account-tokens";
import { getUserByEmail, type UserRecord } from "@/lib/database";
import { appUrl, emailDeliveryConfigured, escapeHtml, sendProductEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const configured = emailDeliveryConfigured();
  let user: UserRecord | undefined;
  try { user = await getUserByEmail(email); }
  catch { return NextResponse.json({ ok: true, deliveryConfigured: configured }); }
  if (user && configured) {
    try {
      const token = await issueAccountToken(user.id, "password_reset", 60);
      const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
      await sendProductEmail(email, "Reset your AgentReady password", `<h2>Password reset</h2><p>Hello ${escapeHtml(user.name)}, use the secure link below to choose a new password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in one hour. Ignore this email if you did not request it.</p>`);
    } catch { /* Keep the response generic to avoid account discovery. */ }
  }
  return NextResponse.json({ ok: true, deliveryConfigured: configured });
}

