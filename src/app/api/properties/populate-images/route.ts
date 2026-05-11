import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Auto-populate images is disabled" }, { status: 403 });
}
