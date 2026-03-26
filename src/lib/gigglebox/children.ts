import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/gigglebox/auth-adapter";
import { getOrCreateParentProfile } from "@/lib/gigglebox/parents";
import { giggleboxEnv } from "@/lib/gigglebox/env";
import { generatePairingCode } from "@/lib/gigglebox/utils";

export const createChildSchema = z.object({
  name: z.string().min(1).max(80),
  nickname: z.string().max(80).optional().nullable(),
  age: z.number().int().min(1).max(18).optional().nullable(),
  avatarKey: z.string().max(80).optional().nullable()
});

export async function listChildrenForParent(authUserId: string, email?: string | null) {
  const supabase = getSupabaseAdminClient();
  const parent = await getOrCreateParentProfile(authUserId, email);

  const result = await supabase
    .from("children")
    .select(`
      *,
      child_device_links!left (
        id,
        is_active,
        linked_at,
        unlinked_at,
        devices!inner (
          id,
          serial_number,
          device_name,
          status,
          last_seen_at
        )
      )
    `)
    .eq("parent_id", parent.id)
    .order("created_at", { ascending: false });

  if (result.error) throw result.error;
  return result.data;
}

export async function createChildForParent(authUserId: string, email: string | null | undefined, input: unknown) {
  const parsed = createChildSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const parent = await getOrCreateParentProfile(authUserId, email);

  const result = await supabase
    .from("children")
    .insert({
      parent_id: parent.id,
      name: parsed.name,
      nickname: parsed.nickname ?? null,
      age: parsed.age ?? null,
      avatar_key: parsed.avatarKey ?? null
    })
    .select("*")
    .single();

  if (result.error) throw result.error;
  return result.data;
}

export async function generateChildPairingCode(authUserId: string, email: string | null | undefined, childId: string) {
  const supabase = getSupabaseAdminClient();
  const parent = await getOrCreateParentProfile(authUserId, email);

  const child = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("parent_id", parent.id)
    .single();

  if (child.error || !child.data) throw new Error("Child not found or not owned by current parent.");

  await supabase
    .from("device_pairing_codes")
    .update({ status: "cancelled" })
    .eq("child_id", childId)
    .eq("status", "active");

  let code = generatePairingCode();
  let attempts = 0;

  while (attempts < 5) {
    const expiresAt = new Date(Date.now() + giggleboxEnv.pairingCodeTtlMinutes * 60 * 1000).toISOString();
    const insert = await supabase
      .from("device_pairing_codes")
      .insert({
        child_id: childId,
        code,
        status: "active",
        expires_at: expiresAt
      })
      .select("*")
      .single();

    if (!insert.error) return insert.data;

    attempts += 1;
    code = generatePairingCode();
  }

  throw new Error("Failed to generate a unique pairing code.");
}

export async function getChildLinkStatus(authUserId: string, email: string | null | undefined, childId: string) {
  const supabase = getSupabaseAdminClient();
  const parent = await getOrCreateParentProfile(authUserId, email);

  const child = await supabase
    .from("children")
    .select("id, name, avatar_key")
    .eq("id", childId)
    .eq("parent_id", parent.id)
    .single();

  if (child.error || !child.data) throw new Error("Child not found.");

  const activeLink = await supabase
    .from("child_device_links")
    .select(`
      id,
      linked_at,
      is_active,
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

  if (activeLink.error) throw activeLink.error;

  const activeCode = await supabase
    .from("device_pairing_codes")
    .select("code, status, expires_at")
    .eq("child_id", childId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeCode.error) throw activeCode.error;

  return {
    child: child.data,
    linked: Boolean(activeLink.data),
    device: activeLink.data?.devices ?? null,
    activeCode: activeCode.data ?? null
  };
}
