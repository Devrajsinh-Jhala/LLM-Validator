import { NextResponse } from "next/server";

import { runDueMonitoring } from "@/lib/monitoring";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handleMonitoring(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Scheduled monitoring is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Invalid monitoring credential." }, { status: 401 });
  }
  const results = await runDueMonitoring(5);
  return NextResponse.json({ processed: results.length, results });
}

export { handleMonitoring as GET, handleMonitoring as POST };

