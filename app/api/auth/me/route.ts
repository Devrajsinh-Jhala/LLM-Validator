import { NextResponse } from "next/server";

import { currentAccount } from "@/lib/auth";

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json(account);
}
