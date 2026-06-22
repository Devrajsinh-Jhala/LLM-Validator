import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getMembershipForUser, getUserById } from "@/lib/database";

export const SESSION_COOKIE = "agentready_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.SESSION_SECRET || "development-only-change-me-before-deploying-agentready";
}

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function hashPassword(password: string, existingSalt?: string) {
  const salt = existingSalt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt).hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(userId: string) {
  const payload = encode(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
    if (!value.sub || value.exp < Math.floor(Date.now() / 1000)) return null;
    return value.sub;
  } catch {
    return null;
  }
}

export async function currentAccount() {
  const cookieStore = await cookies();
  const userId = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const user = await getUserById(userId);
  const membership = await getMembershipForUser(userId);
  if (!user || !membership) return null;
  return {
    user: { id: user.id, name: user.name, email: user.email, emailVerified: Boolean(user.email_verified_at) },
    organization: { id: membership.organization_id, name: membership.organization_name, role: membership.role, credits: membership.credits_remaining },
  };
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

