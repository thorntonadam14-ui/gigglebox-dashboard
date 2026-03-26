import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/gigglebox/auth-adapter";

const telemetrySchema = z.object({
  serialNumber: z.string().min(1),
  eventType: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.any()).default({})
});

export async function ingestTelemetry(input: unknown) {
  const parsed = telemetrySchema.parse(input);
  const supabase = getSupabaseAdminClient();

  const device = await supabase
    .from("devices")
    .select("*")
    .eq("serial_number", parsed.serialNumber)
    .maybeSingle();

  if (device.error) throw device.error;
  if (!device.data) throw new Error("Unknown device.");

  await supabase.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.data.id);

  const activeLink = await supabase
    .from("child_device_links")
    .select("*")
    .eq("device_id", device.data.id)
    .eq("is_active", true)
    .maybeSingle();

  if (activeLink.error) throw activeLink.error;

  const inserted = await supabase
    .from("telemetry_events")
    .insert({
      device_id: device.data.id,
      child_id: activeLink.data?.child_id ?? null,
      event_type: parsed.eventType,
      payload: parsed.payload,
      occurred_at: parsed.occurredAt
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  if (parsed.eventType === "ASKME_INPUT" && Boolean(parsed.payload.flaggedConcern) && activeLink.data?.child_id) {
    await supabase.from("alerts").insert({
      child_id: activeLink.data.child_id,
      telemetry_event_id: inserted.data.id,
      severity: "high",
      alert_type: "concern_detected",
      summary: "Ask Me input flagged a potential concern.",
      status: "open"
    });
  }

  return {
    success: true,
    eventId: inserted.data.id,
    childId: activeLink.data?.child_id ?? null
  };
}
