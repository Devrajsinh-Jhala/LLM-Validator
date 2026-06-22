import { NextResponse } from "next/server";

import { databaseMode, one } from "@/lib/database";

export async function GET() {
  try {
    await one<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, database: databaseMode() });
  } catch {
    return NextResponse.json({ ok: false, database: databaseMode() }, { status: 503 });
  }
}
