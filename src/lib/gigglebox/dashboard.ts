import { getSupabaseAdminClient } from "@/lib/gigglebox/auth-adapter";
import { getOrCreateParentProfile } from "@/lib/gigglebox/parents";
import type { DashboardOverviewResponse } from "@/types/gigglebox";

export async function getDashboardOverview(
  authUserId: string,
  email: string | null | undefined,
  childId: string
): Promise<DashboardOverviewResponse> {
  const supabase = getSupabaseAdminClient();
  const parent = await getOrCreateParentProfile(authUserId, email);

  const child = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("parent_id", parent.id)
    .single();

  if (child.error || !child.data) throw new Error("Child not found.");

  const deviceLink = await supabase
    .from("child_device_links")
    .select(`
      id,
      linked_at,
      devices!inner (
        id,
        serial_number,
        device_name,
        status,
        last_seen_at
      )
    `)
    .eq("child_id", childId)
    .eq("is_active", true)
    .maybeSingle();

  if (deviceLink.error) throw deviceLink.error;

  const recentEvents = await supabase
    .from("telemetry_events")
    .select("*")
    .eq("child_id", childId)
    .order("occurred_at", { ascending: false })
    .limit(10);

  if (recentEvents.error) throw recentEvents.error;

  const alerts = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: false })
    .eq("child_id", childId)
    .eq("status", "open");

  if (alerts.error) throw alerts.error;

  return {
    child: {
      id: child.data.id,
      name: child.data.name,
      age: child.data.age,
      nickname: child.data.nickname,
      avatarKey: child.data.avatar_key
    },
    device: {
      linked: Boolean(deviceLink.data),
      serialNumber: deviceLink.data?.devices?.serial_number ?? null,
      deviceName: deviceLink.data?.devices?.device_name ?? null,
      status: deviceLink.data?.devices?.status ?? null,
      lastSeenAt: deviceLink.data?.devices?.last_seen_at ?? null
    },
    summary: {
      eventCount: recentEvents.data.length,
      lastActiveAt: recentEvents.data[0]?.occurred_at ?? null,
      openAlerts: alerts.count ?? 0
    },
    recentEvents: recentEvents.data
  };
}
