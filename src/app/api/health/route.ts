import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "gigglebox-dashboard-v5-repo-fit",
    timestamp: new Date().toISOString()
  });
}
