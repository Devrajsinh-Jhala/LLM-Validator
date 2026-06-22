import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "agentready_admin";
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function configuredSecret() {
  return process.env.ADMIN_SECRET || "";
}

function sign(value: string) {
  return createHmac("sha256", configuredSecret()).update(value).digest("base64url");
}

export function adminCredentialsValid(candidate: string) {
  const expected = Buffer.from(configuredSecret());
  const received = Buffer.from(candidate);
  return expected.length > 20 && expected.length === received.length && timingSafeEqual(expected, received);
}

export function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readAdminToken(token: string | undefined) {
  if (!configuredSecret() || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof value.exp === "number" && value.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function adminAuthenticated() {
  const store = await cookies();
  return readAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export function adminCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  };
}
