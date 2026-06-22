import { NextResponse } from "next/server";

import { createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { getUserByEmail, transientDatabaseError, type UserRecord } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  let user: UserRecord | undefined;
  try {
    user = await getUserByEmail(email);
  } catch (error) {
    return NextResponse.json(
      { error: transientDatabaseError(error) ? "The database is taking too long to respond. Please try again in a moment." : "The account service is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.email_verified_at) {
    return NextResponse.json({ error: "Verify your email before signing in.", code: "EMAIL_UNVERIFIED" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookieOptions();
  response.cookies.set(cookie.name, createSessionToken(user.id), cookie);
  return response;
}


