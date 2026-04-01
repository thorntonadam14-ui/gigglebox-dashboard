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
  payload: unknown;
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


function coercePayload(payload: unknown): Record<string, unknown> {
  if (!payload) return {};
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { raw: payload };
    } catch {
      return { raw: payload };
    }
  }
  return { raw: String(payload) };
}

function extractEmotion(payload: Record<string, unknown>) {
  return typeof payload?.emotion === "string" ? payload.emotion : null;
}

function extractWord(payload: Record<string, unknown>) {
  return typeof payload?.word === "string" ? payload.word : null;
}

function extractActiveChildId(payload: Record<string, unknown>) {
  if (typeof payload?.activeChildId === "string" && payload.activeChildId.trim()) return payload.activeChildId;
  if (typeof payload?.childId === "string" && payload.childId.trim()) return payload.childId;
  return null;
}

function getTimestamp(value: string | null) {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function sortNewestFirst<T extends { created_at?: string | null; createdAt?: string | null; occurred_at?: string | null; occurredAt?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = getTimestamp(a.created_at ?? a.createdAt ?? a.occurred_at ?? a.occurredAt ?? null);
    const bTime = getTimestamp(b.created_at ?? b.createdAt ?? b.occurred_at ?? b.occurredAt ?? null);
    return bTime - aTime;
  });
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
      supabase.from("telemetry_events").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("children").select("id,name,age,created_at").order("created_at", { ascending: false }),
      supabase.from("devices").select("id,serial_number,device_name,created_at").order("created_at", { ascending: false }),
      supabase.from("child_device_links").select("id,child_id,device_id,created_at").order("created_at", { ascending: false }),
      supabase.from("alerts").select("id,child_id,alert_type,message,created_at").order("created_at", { ascending: false })
    ]);

    if (telemetryResult.error) throw telemetryResult.error;
    if (childrenResult.error) throw childrenResult.error;
    if (devicesResult.error) throw devicesResult.error;
    if (linksResult.error) throw linksResult.error;
    if (alertsResult.error) throw alertsResult.error;

    const telemetry = (telemetryResult.data ?? []) as TelemetryRow[];
    const normalizedTelemetry = telemetry.map((event) => ({
      ...event,
      payload: coercePayload(event.payload)
    }));
    const children = (childrenResult.data ?? []) as ChildRow[];
    const devices = (devicesResult.data ?? []) as DeviceRow[];
    const links = (linksResult.data ?? []) as LinkRow[];
    const alerts = (alertsResult.data ?? []) as AlertRow[];

    const childById = new Map(children.map((child) => [child.id, child]));
    const deviceById = new Map(devices.map((device) => [device.id, device]));

    const latestLinkByDevice = new Map<string, LinkRow>();
    for (const link of sortNewestFirst(links)) {
      if (!latestLinkByDevice.has(link.device_id)) {
        latestLinkByDevice.set(link.device_id, link);
      }
    }

    const deviceToChild = new Map(
      Array.from(latestLinkByDevice.values()).map((link) => [link.device_id, link.child_id] as const)
    );

    const resolveChildIdForEvent = (event: TelemetryRow) => {
      return extractActiveChildId(event.payload) ?? deviceToChild.get(event.device_id) ?? null;
    };

    const filteredTelemetry = childId
      ? normalizedTelemetry.filter((event) => resolveChildIdForEvent(event) === childId)
      : normalizedTelemetry;

    const filteredChildren = childId
      ? children.filter((child) => child.id === childId)
      : children;

    const filteredLinks = childId
      ? Array.from(latestLinkByDevice.values()).filter((link) => link.child_id === childId)
      : Array.from(latestLinkByDevice.values());

    const filteredDevices = childId
      ? devices.filter((device) => {
          const latestChild = deviceToChild.get(device.id);
          return latestChild === childId || filteredTelemetry.some((event) => event.device_id === device.id);
        })
      : devices;

    const filteredAlerts = childId
      ? alerts.filter((alert) => alert.child_id === childId)
      : alerts;

    const latestEvent = filteredTelemetry[0] ?? null;
    const latestWord =
      filteredTelemetry.map((event) => extractWord(event.payload)).find((value) => Boolean(value)) ?? null;

    const emotionEvents = filteredTelemetry.filter((event) => isEmotionEvent(event.event_type));
    const latestEmotion =
      emotionEvents.map((event) => extractEmotion(event.payload)).find((value) => Boolean(value)) ?? null;

    const coloringEvents = filteredTelemetry.filter((event) => isColoringEvent(event.event_type));

    const eventTypes = filteredTelemetry.reduce<Record<string, number>>((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    }, {});

    const childCards = filteredChildren.map((child) => {
      const childLinks = Array.from(latestLinkByDevice.values()).filter((link) => link.child_id === child.id);
      const linkedDeviceIds = childLinks.map((link) => link.device_id);
      const childEvents = normalizedTelemetry.filter((event) => resolveChildIdForEvent(event) === child.id);
      const childLatestEvent = childEvents[0] ?? null;
      const latestEmotionForChild =
        childEvents
          .filter((event) => isEmotionEvent(event.event_type))
          .map((event) => extractEmotion(event.payload))
          .find((value) => Boolean(value)) ?? null;

      return {
        id: child.id,
        name: child.name,
        age: child.age,
        createdAt: child.created_at,
        linkedDevice: linkedDeviceIds.length ? deviceById.get(linkedDeviceIds[0]) ?? null : null,
        totalEvents: childEvents.length,
        latestEmotion: latestEmotionForChild,
        lastActivityAt: childLatestEvent?.created_at ?? childLatestEvent?.occurred_at ?? null
      };
    });

    const recentActivity = filteredTelemetry.slice(0, 30).map((event) => {
      const resolvedChildId = resolveChildIdForEvent(event);
      return {
        id: event.id,
        eventType: event.event_type,
        payload: event.payload ?? {},
        deviceId: event.device_id,
        childId: resolvedChildId,
        childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
        occurredAt: event.occurred_at,
        createdAt: event.created_at
      };
    });

    const words = filteredTelemetry
      .filter((event) => event.event_type === "word_spoken")
      .map((event) => {
        const resolvedChildId = resolveChildIdForEvent(event);
        return {
          id: event.id,
          word: extractWord(event.payload),
          childId: resolvedChildId,
          childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
          createdAt: event.created_at
        };
      })
      .filter((item) => Boolean(item.word));

    const emotions = emotionEvents
      .map((event) => {
        const resolvedChildId = resolveChildIdForEvent(event);
        return {
          id: event.id,
          emotion: extractEmotion(event.payload),
          childId: resolvedChildId,
          childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
          createdAt: event.created_at
        };
      })
      .filter((item) => Boolean(item.emotion));

    const savedArtwork = coloringEvents.map((event) => {
      const resolvedChildId = resolveChildIdForEvent(event);
      return {
        id: event.id,
        childId: resolvedChildId,
        childName: resolvedChildId ? childById.get(resolvedChildId)?.name ?? null : null,
        imageUrl: typeof event.payload?.imageUrl === "string" ? event.payload.imageUrl : null,
        page: typeof event.payload?.page === "string" ? event.payload.page : null,
        title: typeof event.payload?.title === "string" ? event.payload.title : null,
        payload: event.payload ?? {},
        createdAt: event.created_at
      };
    });

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
