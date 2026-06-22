import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { query } from "@/lib/database";

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const history = await query<{ id: string; amount: number; reason: string; scan_id: string | null; created_at: string }>(
    "SELECT id, amount, reason, scan_id, created_at FROM credit_transactions WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 25",
    [account.organization.id],
  );
  return NextResponse.json({ credits: account.organization.credits, history });
}
