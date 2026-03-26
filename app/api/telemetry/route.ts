
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { deviceId, eventType, payload } = body;

    if (!deviceId || !eventType) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("telemetry_events")
      .insert([
        {
          device_id: deviceId,
          event_type: eventType,
          payload: payload || {},
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      telemetry: data,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
