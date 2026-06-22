import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminCookieOptions, adminCredentialsValid, createAdminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: { secret?: string };
  try { body = (await request.json()) as typeof body; }
  catch { return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 }); }
  if (!adminCredentialsValid(body.secret ?? "")) return NextResponse.json({ error: "Administrator credential is incorrect." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions());
  return response;
}
