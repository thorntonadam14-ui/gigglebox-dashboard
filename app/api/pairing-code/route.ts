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

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function farFutureIso() {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 10);
  return future.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const childId = typeof body?.childId === "string" ? body.childId.trim() : "";

    if (!childId) {
      return NextResponse.json(
        { ok: false, error: "childId is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existingRows, error: existingError } = await supabase
      .from("device_pairing_codes")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    const existing = existingRows?.[0] ?? null;
    const expiresAt = farFutureIso();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("device_pairing_codes")
        .update({
          expires_at: expiresAt,
          used: false
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        ok: true,
        pairingCode: updated,
        reused: true
      });
    }

    const code = generateCode();

    const { data: created, error: createError } = await supabase
      .from("device_pairing_codes")
      .insert({
        code,
        child_id: childId,
        expires_at: expiresAt,
        used: false
      })
      .select("*")
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      ok: true,
      pairingCode: created,
      reused: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
