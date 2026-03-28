import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getSupabaseAdmin() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const serialNumber = typeof body?.serialNumber === "string" ? body.serialNumber.trim() : "";
    const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : "GiggleBox Toy";

    if (!code || !serialNumber) {
      return NextResponse.json(
        { ok: false, error: "code and serialNumber are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: pairingCode, error: pairingError } = await supabase
      .from("device_pairing_codes")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .single();

    if (pairingError || !pairingCode) {
      return NextResponse.json(
        { ok: false, error: "Invalid or used pairing code." },
        { status: 400 }
      );
    }

    if (new Date(pairingCode.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Pairing code expired." },
        { status: 400 }
      );
    }

    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id, name")
      .eq("id", pairingCode.child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { ok: false, error: "Child not found for pairing code." },
        { status: 400 }
      );
    }

    let deviceId: string;

    const { data: existingDevice } = await supabase
      .from("devices")
      .select("*")
      .eq("serial_number", serialNumber)
      .maybeSingle();

    if (existingDevice) {
      deviceId = existingDevice.id;
    } else {
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .insert({
          serial_number: serialNumber,
          device_name: deviceName
        })
        .select("*")
        .single();

      if (deviceError || !device) {
        throw deviceError ?? new Error("Failed to create device.");
      }

      deviceId = device.id;
    }

    const { data: link, error: linkError } = await supabase
      .from("child_device_links")
      .insert({
        child_id: pairingCode.child_id,
        device_id: deviceId
      })
      .select("*")
      .single();

    if (linkError) throw linkError;

    const { error: usedError } = await supabase
      .from("device_pairing_codes")
      .update({ used: true })
      .eq("id", pairingCode.id);

    if (usedError) throw usedError;

    return NextResponse.json({
      ok: true,
      linked: true,
      childId: pairingCode.child_id,
      childName: child.name,
      deviceId,
      deviceName,
      serialNumber,
      link
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
