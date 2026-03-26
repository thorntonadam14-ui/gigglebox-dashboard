import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/gigglebox/auth-adapter";

const claimCodeSchema = z.object({
  serialNumber: z.string().min(1),
  deviceName: z.string().optional().nullable(),
  code: z.string().length(6)
});

export async function claimPairingCode(input: unknown) {
  const parsed = claimCodeSchema.parse(input);
  const supabase = getSupabaseAdminClient();

  const pairing = await supabase
    .from("device_pairing_codes")
    .select("*")
    .eq("code", parsed.code)
    .eq("status", "active")
    .maybeSingle();

  if (pairing.error) throw pairing.error;
  if (!pairing.data) throw new Error("Pairing code not found.");

  if (new Date(pairing.data.expires_at).getTime() < Date.now()) {
    await supabase.from("device_pairing_codes").update({ status: "expired" }).eq("id", pairing.data.id);
    throw new Error("Pairing code expired.");
  }

  let deviceId: string;
  const existingDevice = await supabase
    .from("devices")
    .select("*")
    .eq("serial_number", parsed.serialNumber)
    .maybeSingle();

  if (existingDevice.error) throw existingDevice.error;

  if (existingDevice.data) {
    deviceId = existingDevice.data.id;
    const updated = await supabase
      .from("devices")
      .update({
        device_name: parsed.deviceName ?? existingDevice.data.device_name,
        status: "linked",
        last_seen_at: new Date().toISOString()
      })
      .eq("id", deviceId);
    if (updated.error) throw updated.error;
  } else {
    const created = await supabase
      .from("devices")
      .insert({
        serial_number: parsed.serialNumber,
        device_name: parsed.deviceName ?? null,
        status: "linked",
        last_seen_at: new Date().toISOString()
      })
      .select("*")
      .single();
    if (created.error) throw created.error;
    deviceId = created.data.id;
  }

  await supabase
    .from("child_device_links")
    .update({
      is_active: false,
      unlinked_at: new Date().toISOString()
    })
    .eq("device_id", deviceId)
    .eq("is_active", true);

  const link = await supabase
    .from("child_device_links")
    .insert({
      child_id: pairing.data.child_id,
      device_id: deviceId,
      is_active: true
    })
    .select("*")
    .single();

  if (link.error) throw link.error;

  const pairingUpdate = await supabase
    .from("device_pairing_codes")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      claimed_device_id: deviceId
    })
    .eq("id", pairing.data.id);

  if (pairingUpdate.error) throw pairingUpdate.error;

  return {
    success: true,
    childId: pairing.data.child_id,
    deviceId,
    linkedAt: link.data.linked_at
  };
}
