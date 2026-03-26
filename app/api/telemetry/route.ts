
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { deviceId, eventType, payload } = body;

    if (!deviceId || !eventType) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // TODO: connect to Supabase here
    console.log("Telemetry received:", { deviceId, eventType, payload });

    return NextResponse.json({
      ok: true,
      message: "Telemetry stored",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
