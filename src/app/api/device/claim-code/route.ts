import { NextRequest, NextResponse } from "next/server";
import { claimPairingCode } from "@/lib/gigglebox/devices";
import { assertDeviceApiKey } from "@/lib/gigglebox/security";

export async function POST(request: NextRequest) {
  try {
    assertDeviceApiKey(request.headers.get("x-device-api-key"));
    const body = await request.json();
    const result = await claimPairingCode(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 400 });
  }
}
