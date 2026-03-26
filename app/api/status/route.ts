import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [childrenResult, linksResult, devicesResult] = await Promise.all([
      supabase.from("children").select("id", { count: "exact", head: true }),
      supabase.from("child_device_links").select("id", { count: "exact", head: true }),
      supabase.from("devices").select("id", { count: "exact", head: true })
    ]);

    if (childrenResult.error) throw childrenResult.error;
    if (linksResult.error) throw linksResult.error;
    if (devicesResult.error) throw devicesResult.error;

    const hasChild = (childrenResult.count ?? 0) > 0;
    const hasDevice = (devicesResult.count ?? 0) > 0;
    const hasLink = (linksResult.count ?? 0) > 0;

    return NextResponse.json({
      ok: true,
      hasChild,
      hasDevice,
      hasLink,
      ready: hasChild && hasDevice && hasLink
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        hasChild: false,
        hasDevice: false,
        hasLink: false,
        ready: false
      },
      { status: 500 }
    );
  }
}
