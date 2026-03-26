import { NextRequest, NextResponse } from "next/server";
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

type ChildRow = {
  id: string;
  name: string;
  age: number | null;
  created_at: string | null;
};

type DeviceRow = {
  id: string;
  serial_number: string;
  device_name: string | null;
  created_at: string | null;
};

type LinkRow = {
  id: string;
  child_id: string;
  device_id: string;
  created_at: string | null;
};

type AlertRow = {
  id: string;
  child_id: string | null;
  alert_type: string | null;
  message: string | null;
  created_at: string | null;
};

function isEmotionEvent(type: string) {
  return ["emotion_state", "emotion_selected", "emotion_detected"].includes(type);
}

function isColoringEvent(type: string) {
  return ["coloring_saved", "coloring_book_saved", "coloring_save"].includes(type);
}

function extractEmotion(payload: Record<string, unknown> | null) {
  return typeof payload?.emotion === "string" ? payload.emotion : null;
}

function extractWord(payload: Record<string, unknown> | null) {
  return typeof payload?.word === "string" ? payload.word : null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const childId = request.nextUrl.searchParams.get("childId");

    const [
      telemetryResult,
      childrenResult,
      devicesResult,
      linksResult,
      alertsResult
    ] = await Promise.all([
      supabase
        .from("telemetry_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
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
        .order("created_at", { ascending: false }),
      supabase
        .from("alerts")
        .select("id,child_id,alert_type,message,created_at")
        .order("created_at", { ascending: false })
    ]);

    if (telemetryResult.error) throw telemetryResult.error;
    if (childrenResult.error) throw childrenResult.error;
    if (devicesResult.error) throw devicesResult.error;
    if (linksResult.error) throw linksResult.error;
    if (alertsResult.error) throw alertsResult.error;

    const telemetry = (telemetryResult.data ?? []) as TelemetryRow[];
    const children = (childrenResult.data ?? []) as ChildRow[];
    const devices = (devicesResult.data ?? []) as DeviceRow[];
    const links = (linksResult.data ?? []) as LinkRow[];
    const alerts = (alertsResult.data ?? []) as AlertRow[];

    const childById = new Map(children.map((child) => [child.id, child]));
    const deviceById = new Map(devices.map((device) => [device.id, device]));
    const deviceToChild = new Map(links.map((link) => [link.device_id, link.child_id]));

    const filteredTelemetry = childId
      ? telemetry.filter((event) => deviceToChild.get(event.device_id) === childId)
      : telemetry;

    const filteredChildren = childId
      ? children.filter((child) => child.id === childId)
      : children;

    const filteredLinks = childId
      ? links.filter((link) => link.child_id === childId)
      : links;

    const filteredDevices = childId
      ? devices.filter((device) => deviceToChild.get(device.id) === childId)
      : devices;

    const filteredAlerts = childId
      ? alerts.filter((alert) => alert.child_id === childId)
      : alerts;

    const latestEvent = filteredTelemetry[0] ?? null;
    const latestWord = filteredTelemetry
      .map((event) => extractWord(event.payload))
      .find(Boolean) ?? null;
    const emotionEvents = filteredTelemetry.filter((event) => isEmotionEvent(event.event_type));
    const latestEmotion = emotionEvents
      .map((event) => extractEmotion(event.payload))
      .find(Boolean) ?? null;
    const coloringEvents = filteredTelemetry.filter((event) => isColoringEvent(event.event_type));

    const emotionBreakdown = emotionEvents.reduce<Record<string, number>>((acc, event) => {
      const emotion = extractEmotion(event.payload) ?? "unknown";
      acc[emotion] = (acc[emotion] ?? 0) + 1;
      return acc;
    }, {});

    const eventTypes = filteredTelemetry.reduce<Record<string, number>>((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    }, {});

    const childCards = filteredChildren.map((child) => {
      const childLinks = links.filter((link) => link.child_id === child.id);
      const linkedDeviceIds = childLinks.map((link) => link.device_id);
      const childEvents = telemetry.filter((event) => linkedDeviceIds.includes(event.device_id));
      const childLatestEvent = childEvents[0] ?? null;
      const latestEmotionForChild = childEvents
        .filter((event) => isEmotionEvent(event.event_type))
        .map((event) => extractEmotion(event.payload))
        .find(Boolean) ?? null;

      return {
        id: child.id,
        name: child.name,
        age: child.age,
        createdAt: child.created_at,
        linkedDevice: linkedDeviceIds.length
          ? deviceById.get(linkedDeviceIds[0]) ?? null
          : null,
        totalEvents: childEvents.length,
        latestEmotion: latestEmotionForChild,
        lastActivityAt: childLatestEvent?.created_at ?? childLatestEvent?.occurred_at ?? null
      };
    });

    const recentActivity = filteredTelemetry.slice(0, 30).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      payload: event.payload ?? {},
      deviceId: event.device_id,
      childId: deviceToChild.get(event.device_id) ?? null,
      childName: deviceToChild.get(event.device_id)
        ? childById.get(deviceToChild.get(event.device_id)!)?.name ?? null
        : null,
      occurredAt: event.occurred_at,
      createdAt: event.created_at
    }));

    const words = filteredTelemetry
      .filter((event) => event.event_type === "word_spoken")
      .map((event) => ({
        id: event.id,
        word: extractWord(event.payload),
        childId: deviceToChild.get(event.device_id) ?? null,
        childName: deviceToChild.get(event.device_id)
          ? childById.get(deviceToChild.get(event.device_id)!)?.name ?? null
          : null,
        createdAt: event.created_at
      }));

    const emotions = emotionEvents.map((event) => ({
      id: event.id,
      emotion: extractEmotion(event.payload),
      childId: deviceToChild.get(event.device_id) ?? null,
      childName: deviceToChild.get(event.device_id)
        ? childById.get(deviceToChild.get(event.device_id)!)?.name ?? null
        : null,
      createdAt: event.created_at
    }));

    const savedArtwork = coloringEvents.map((event) => ({
      id: event.id,
      childId: deviceToChild.get(event.device_id) ?? null,
      childName: deviceToChild.get(event.device_id)
        ? childById.get(deviceToChild.get(event.device_id)!)?.name ?? null
        : null,
      imageUrl: typeof event.payload?.imageUrl === "string" ? event.payload.imageUrl : null,
      page: typeof event.payload?.page === "string" ? event.payload.page : null,
      title: typeof event.payload?.title === "string" ? event.payload.title : null,
      payload: event.payload ?? {},
      createdAt: event.created_at
    }));

    return NextResponse.json({
      ok: true,
      filters: { childId },
      summary: {
        totalChildren: filteredChildren.length,
        totalDevices: filteredDevices.length,
        totalLinks: filteredLinks.length,
        totalEvents: filteredTelemetry.length,
        lastActivityAt: latestEvent?.created_at ?? latestEvent?.occurred_at ?? null,
        lastEventType: latestEvent?.event_type ?? null,
        latestWord,
        latestEmotion,
        coloringSaveCount: savedArtwork.length,
        openAlerts: filteredAlerts.length
      },
      children: childCards,
      recentActivity,
      deepDive: {
        words,
        emotions,
        savedArtwork,
        eventTypes
      },
      alerts: filteredAlerts
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
