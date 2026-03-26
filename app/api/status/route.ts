import { NextResponse } from "next/server";

export async function GET() {
  // TEMP MOCK (replace later with Supabase query)
  const hasChild = true;
  const hasDevice = true;

  return NextResponse.json({
    hasChild,
    hasDevice,
    ready: hasChild && hasDevice
  });
}
