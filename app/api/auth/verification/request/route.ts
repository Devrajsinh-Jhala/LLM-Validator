import { NextResponse } from "next/server";

import { issueAccountToken } from "@/lib/account-tokens";
import { currentAccount } from "@/lib/auth";
import { appUrl, emailDeliveryConfigured, escapeHtml, sendProductEmail } from "@/lib/email";

export async function POST() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (account.user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (!emailDeliveryConfigured()) return NextResponse.json({ error: "Email delivery is not configured yet. Contact support for verification." }, { status: 503 });
  const token = await issueAccountToken(account.user.id, "email_verification", 24 * 60);
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  const delivery = await sendProductEmail(account.user.email, "Verify your AgentReady email", `<h2>Verify your email</h2><p>Hello ${escapeHtml(account.user.name)}, confirm this address to secure your AgentReady workspace.</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`);
  if (!delivery.sent) return NextResponse.json({ error: delivery.reason || "Verification email could not be sent." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
