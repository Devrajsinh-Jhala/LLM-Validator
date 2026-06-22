import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";
import { getScan, parseStoredResult } from "@/lib/database";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const scan = await getScan(id, account.organization.id);
  if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  return NextResponse.json({
    scan: {
      id: scan.id,
      siteId: scan.site_id,
      status: scan.status,
      score: scan.score,
      grade: scan.grade,
      error: scan.error,
      shareToken: scan.share_token,
      startedAt: scan.started_at,
      completedAt: scan.completed_at,
      result: parseStoredResult(scan),
    },
  });
}
