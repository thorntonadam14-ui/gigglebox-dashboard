import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseAdmin() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

type TelemetryRow = {
  id: string;
  device_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string | null;
  created_at: string | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [
      telemetryResult,
      childrenResult,
      devicesResult,
      linksResult
    ] = await Promise.all([
      supabase
        .from("telemetry_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("children")
        .select("id,name,age,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("devices")
        .select("id,serial_number,device_name,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("child_device_links")
        .select("id,child_id,device_id,created_at")
        .order("created_at", { ascending: false })
    ]);

    if (telemetryResult.error) throw telemetryResult.error;
    if (childrenResult.error) throw childrenResult.error;
    if (devicesResult.error) throw devicesResult.error;
    if (linksResult.error) throw linksResult.error;

    const telemetry = (telemetryResult.data ?? []) as TelemetryRow[];
    const children = childrenResult.data ?? [];
    const devices = devicesResult.data ?? [];
    const links = linksResult.data ?? [];

    const latestEvent = telemetry[0] ?? null;

    const wordEvents = telemetry.filter((event) => event.event_type === "word_spoken");
    const lastWord = (() => {
      const row = wordEvents.find((event) => typeof event.payload?.word === "string");
      return row?.payload?.word as string | undefined;
    })();

    const emotionEvents = telemetry.filter(
      (event) =>
        event.event_type === "emotion_state" ||
        event.event_type === "emotion_selected" ||
        event.event_type === "emotion_detected"
    );

    const emotionCounts = emotionEvents.reduce<Record<string, number>>((acc, event) => {
      const emotion = typeof event.payload?.emotion === "string"
        ? event.payload.emotion
        : "unknown";
      acc[emotion] = (acc[emotion] ?? 0) + 1;
      return acc;
    }, {});

    const latestEmotion = (() => {
      const row = emotionEvents.find((event) => typeof event.payload?.emotion === "string");
      return row?.payload?.emotion as string | undefined;
    })();

    const coloringEvents = telemetry.filter(
      (event) =>
        event.event_type === "coloring_saved" ||
        event.event_type === "coloring_book_saved" ||
        event.event_type === "coloring_save"
    );

    const latestColoringSave = coloringEvents.find((event) => event.payload) ?? null;

    return NextResponse.json({
      ok: true,
      summary: {
        totalChildren: children.length,
        totalDevices: devices.length,
        totalLinks: links.length,
        totalEvents: telemetry.length,
        lastEventType: latestEvent?.event_type ?? null,
        lastEventAt: latestEvent?.created_at ?? latestEvent?.occurred_at ?? null,
        lastWord: lastWord ?? null,
        emotionEventCount: emotionEvents.length,
        latestEmotion: latestEmotion ?? null,
        coloringSaveCount: coloringEvents.length
      },
      children,
      devices,
      emotionBreakdown: emotionCounts,
      latestColoringSave,
      recentActivity: telemetry.map((event) => ({
        id: event.id,
        deviceId: event.device_id,
        eventType: event.event_type,
        payload: event.payload ?? {},
        occurredAt: event.occurred_at,
        createdAt: event.created_at
      }))
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
