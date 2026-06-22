import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { one, query } from "@/lib/database";

export type AccountTokenType = "email_verification" | "password_reset";

interface TokenRecord extends Record<string, unknown> {
  id: string;
  user_id: string;
  email: string;
  name: string;
  expires_at: string;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccountToken(userId: string, type: AccountTokenType, lifetimeMinutes: number) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lifetimeMinutes * 60 * 1000).toISOString();
  await query(
    "UPDATE account_tokens SET used_at = $1 WHERE user_id = $2 AND type = $3 AND used_at IS NULL RETURNING id",
    [now.toISOString(), userId, type],
  );
  await query(
    "INSERT INTO account_tokens (id, user_id, type, token_hash, expires_at, used_at, created_at) VALUES ($1, $2, $3, $4, $5, NULL, $6) RETURNING id",
    [randomUUID(), userId, type, tokenHash(token), expiresAt, now.toISOString()],
  );
  return token;
}

export async function consumeAccountToken(token: string, type: AccountTokenType) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return undefined;
  return one<TokenRecord>(`
    UPDATE account_tokens SET used_at = $1
    WHERE token_hash = $2 AND type = $3 AND used_at IS NULL AND expires_at > $1
    RETURNING user_id,
      (SELECT email FROM users WHERE users.id = account_tokens.user_id) AS email,
      (SELECT name FROM users WHERE users.id = account_tokens.user_id) AS name,
      expires_at
  `, [new Date().toISOString(), tokenHash(token), type]);
}
