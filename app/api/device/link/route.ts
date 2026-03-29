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
        { ok: false, linked: false, message: "code and serialNumber are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Prototype-safe / idempotent behavior:
    // allow the same pairing code to be reused instead of hard-failing once "used" is true.
    // always take the newest matching code record.
    const { data: pairingRows, error: pairingError } = await supabase
      .from("device_pairing_codes")
      .select("*")
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1);

    const pairingCode = pairingRows?.[0] ?? null;

    if (pairingError || !pairingCode) {
      return NextResponse.json(
        { ok: false, linked: false, message: "Invalid pairing code." },
        { status: 400 }
      );
    }

    if (pairingCode.expires_at && new Date(pairingCode.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, linked: false, message: "Pairing code expired." },
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
        { ok: false, linked: false, message: "Child not found for pairing code." },
        { status: 400 }
      );
    }

    let deviceId: string;

    const { data: existingDevice, error: existingDeviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("serial_number", serialNumber)
      .maybeSingle();

    if (existingDeviceError) throw existingDeviceError;

    if (existingDevice) {
      deviceId = existingDevice.id;

      // keep device name aligned if user renamed it later
      if (deviceName && existingDevice.device_name !== deviceName) {
        await supabase
          .from("devices")
          .update({ device_name: deviceName })
          .eq("id", deviceId);
      }
    } else {
      const { data: createdDevice, error: createDeviceError } = await supabase
        .from("devices")
        .insert({
          serial_number: serialNumber,
          device_name: deviceName
        })
        .select("*")
        .single();

      if (createDeviceError || !createdDevice) {
        throw createDeviceError ?? new Error("Failed to create device.");
      }

      deviceId = createdDevice.id;
    }

    // Idempotent link behavior:
    // if this exact child <-> device link already exists, return it instead of creating duplicates.
    const { data: existingLinkRows, error: existingLinkError } = await supabase
      .from("child_device_links")
      .select("*")
      .eq("child_id", pairingCode.child_id)
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingLinkError) throw existingLinkError;

    let link = existingLinkRows?.[0] ?? null;

    if (!link) {
      const { data: insertedLink, error: insertLinkError } = await supabase
        .from("child_device_links")
        .insert({
          child_id: pairingCode.child_id,
          device_id: deviceId
        })
        .select("*")
        .single();

      if (insertLinkError || !insertedLink) {
        throw insertLinkError ?? new Error("Failed to create child-device link.");
      }

      link = insertedLink;
    }

    // Best-effort mark as used, but do not fail the whole link flow if this update has issues.
    await supabase
      .from("device_pairing_codes")
      .update({ used: true })
      .eq("id", pairingCode.id);

    return NextResponse.json({
      ok: true,
      linked: true,
      message: existingLinkRows?.length ? "Device already linked. Reusing existing link." : "Device linked successfully.",
      childId: pairingCode.child_id,
      childName: child.name,
      deviceId,
      deviceName,
      serialNumber,
      link
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        linked: false,
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
