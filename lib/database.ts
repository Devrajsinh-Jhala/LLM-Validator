import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type { ScanResult } from "@/lib/scanner/types";

const globals = globalThis as typeof globalThis & {
  agentReadyLocalDb?: DatabaseSync;
  agentReadyNeon?: NeonQueryFunction<false, false>;
  agentReadySchema?: Promise<void>;
};

const usesNeon = Boolean(process.env.DATABASE_URL?.startsWith("postgres"));

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
    email_verified_at TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    credits_remaining INTEGER NOT NULL DEFAULT 3, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS memberships (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner', created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, organization_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, url TEXT NOT NULL, frequency TEXT NOT NULL DEFAULT 'weekly',
    next_scan_at TEXT, last_scan_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE (organization_id, url)
  )`,
  `CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE, status TEXT NOT NULL,
    score INTEGER, grade TEXT, result_json TEXT, error TEXT, share_token TEXT UNIQUE,
    started_at TEXT NOT NULL, completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS agency_settings (
    organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL, accent_color TEXT NOT NULL DEFAULT '#0f766e',
    report_footer TEXT NOT NULL DEFAULT 'Prepared with AgentReady', contact_email TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, reason TEXT NOT NULL, scan_id TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS guest_scan_limits (
    fingerprint TEXT PRIMARY KEY, used_count INTEGER NOT NULL DEFAULT 0,
    reset_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS account_tokens (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL,
    used_at TEXT, created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_sites_org ON sites(organization_id)",
  "CREATE INDEX IF NOT EXISTS idx_sites_next_scan ON sites(next_scan_at)",
  "CREATE INDEX IF NOT EXISTS idx_scans_site ON scans(site_id, started_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_scans_org ON scans(organization_id, started_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_credits_org ON credit_transactions(organization_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_account_tokens_user ON account_tokens(user_id, type, created_at DESC)",
];

function localDatabase() {
  if (!globals.agentReadyLocalDb) {
    const path = process.env.DATABASE_PATH || join(process.cwd(), ".data", "agentready.db");
    mkdirSync(dirname(path), { recursive: true });
    globals.agentReadyLocalDb = new DatabaseSync(path);
    globals.agentReadyLocalDb.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  }
  return globals.agentReadyLocalDb;
}

function neonDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for Neon.");
  if (!globals.agentReadyNeon) globals.agentReadyNeon = neon(process.env.DATABASE_URL);
  return globals.agentReadyNeon;
}

function sqliteQuery(text: string, params: unknown[]) {
  const ordered: unknown[] = [];
  const converted = text.replace(/\$(\d+)/g, (_match, index: string) => {
    ordered.push(params[Number(index) - 1]);
    return "?";
  });
  return localDatabase().prepare(converted).all(...(ordered as Array<string | number | null>)) as unknown[];
}

function errorChain(error: unknown) {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const value = current as { message?: unknown; sourceError?: unknown; cause?: unknown };
    if (typeof value.message === "string") messages.push(value.message);
    current = value.sourceError ?? value.cause;
  }
  return messages.join(" ");
}

export function transientDatabaseError(error: unknown) {
  return /fetch failed|connect timeout|UND_ERR_CONNECT_TIMEOUT|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket/i.test(errorChain(error));
}

async function neonQueryWithRetry<T extends Record<string, unknown>>(text: string, params: unknown[]) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return (await neonDatabase().query(text, params)) as T[];
    } catch (error) {
      lastError = error;
      if (!transientDatabaseError(error) || attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

async function rawQuery<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  if (usesNeon) return neonQueryWithRetry<T>(text, params);
  return sqliteQuery(text, params) as T[];
}

export async function initializeDatabase() {
  if (!globals.agentReadySchema) {
    globals.agentReadySchema = (async () => {
      if (usesNeon) {
        for (const statement of schema) await neonDatabase().query(statement);
        await neonDatabase().query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 3");
        await neonDatabase().query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT");
      } else {
        const database = localDatabase();
        for (const statement of schema) database.exec(statement);
        try { database.exec("ALTER TABLE organizations ADD COLUMN credits_remaining INTEGER NOT NULL DEFAULT 3"); } catch { /* Existing column. */ }
        try { database.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT"); } catch { /* Existing column. */ }
      }
    })();
  }
  return globals.agentReadySchema;
}

export async function query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  await initializeDatabase();
  return rawQuery<T>(text, params);
}

export async function one<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  return (await query<T>(text, params))[0];
}

export interface UserRecord extends Record<string, unknown> {
  id: string; email: string; name: string; password_hash: string; password_salt: string;
  email_verified_at: string | null; created_at: string;
}
export interface MembershipRecord extends Record<string, unknown> {
  user_id: string; organization_id: string; role: string; organization_name: string; credits_remaining: number;
}
export interface SiteRecord extends Record<string, unknown> {
  id: string; organization_id: string; name: string; url: string; frequency: "manual" | "weekly";
  next_scan_at: string | null; last_scan_at: string | null; created_at: string; updated_at: string;
}
export interface ScanRecord extends Record<string, unknown> {
  id: string; organization_id: string; site_id: string; status: "running" | "completed" | "failed";
  score: number | null; grade: string | null; result_json: string | null; error: string | null;
  share_token: string | null; started_at: string; completed_at: string | null;
}

export const getUserByEmail = (email: string) => one<UserRecord>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
export const getUserById = (id: string) => one<UserRecord>("SELECT * FROM users WHERE id = $1", [id]);
export const getMembershipForUser = (userId: string) => one<MembershipRecord>(
  `SELECT m.*, o.name AS organization_name, o.credits_remaining FROM memberships m
   JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = $1 LIMIT 1`, [userId],
);

export function listSites(organizationId: string) {
  return query<SiteRecord & { latest_score: number | null; latest_grade: string | null; latest_status: string | null; latest_scan_id: string | null; latest_scan_at: string | null }>(`
    SELECT s.*, latest.score AS latest_score, latest.grade AS latest_grade,
      latest.status AS latest_status, latest.id AS latest_scan_id, latest.started_at AS latest_scan_at
    FROM sites s LEFT JOIN scans latest ON latest.id = (
      SELECT id FROM scans WHERE site_id = s.id ORDER BY started_at DESC LIMIT 1
    ) WHERE s.organization_id = $1 ORDER BY s.created_at DESC
  `, [organizationId]);
}

export const getSite = (siteId: string, organizationId: string) => one<SiteRecord>(
  "SELECT * FROM sites WHERE id = $1 AND organization_id = $2", [siteId, organizationId],
);
export const getScan = (scanId: string, organizationId?: string) => organizationId
  ? one<ScanRecord>("SELECT * FROM scans WHERE id = $1 AND organization_id = $2", [scanId, organizationId])
  : one<ScanRecord>("SELECT * FROM scans WHERE id = $1", [scanId]);
export const getScanByShareToken = (token: string) => one<ScanRecord>(
  "SELECT * FROM scans WHERE share_token = $1 AND status = 'completed'", [token],
);

export function parseStoredResult(scan: ScanRecord) {
  return scan.result_json ? JSON.parse(scan.result_json) as ScanResult : null;
}

export async function consumeWorkspaceCredit(organizationId: string) {
  const row = await one<{ credits_remaining: number }>(
    "UPDATE organizations SET credits_remaining = credits_remaining - 1 WHERE id = $1 AND credits_remaining > 0 RETURNING credits_remaining",
    [organizationId],
  );
  return row?.credits_remaining ?? null;
}

export async function refundWorkspaceCredit(organizationId: string) {
  await query("UPDATE organizations SET credits_remaining = credits_remaining + 1 WHERE id = $1 RETURNING credits_remaining", [organizationId]);
}

export async function recordCredit(organizationId: string, amount: number, reason: string, scanId?: string) {
  const { randomUUID } = await import("node:crypto");
  await query(
    "INSERT INTO credit_transactions (id, organization_id, amount, reason, scan_id, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [randomUUID(), organizationId, amount, reason, scanId ?? null, new Date().toISOString()],
  );
}

export async function consumeGuestCredit(fingerprint: string) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const rows = await query<{ used_count: number; reset_at: string }>(`
    INSERT INTO guest_scan_limits (fingerprint, used_count, reset_at, updated_at)
    VALUES ($1, 1, $2, $3)
    ON CONFLICT (fingerprint) DO UPDATE SET
      used_count = CASE WHEN guest_scan_limits.reset_at <= $3 THEN 1 ELSE guest_scan_limits.used_count + 1 END,
      reset_at = CASE WHEN guest_scan_limits.reset_at <= $3 THEN $2 ELSE guest_scan_limits.reset_at END,
      updated_at = $3
    WHERE guest_scan_limits.reset_at <= $3 OR guest_scan_limits.used_count < 1
    RETURNING used_count, reset_at
  `, [fingerprint, resetAt, now.toISOString()]);
  return rows[0] ?? null;
}

export function databaseMode() {
  return usesNeon ? "neon" : "sqlite-fallback";
}




