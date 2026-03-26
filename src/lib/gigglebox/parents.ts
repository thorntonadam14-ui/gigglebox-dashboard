import { getSupabaseAdminClient } from "@/lib/gigglebox/auth-adapter";

export async function getOrCreateParentProfile(authUserId: string, email?: string | null) {
  const supabase = getSupabaseAdminClient();

  const existing = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await supabase
    .from("parent_profiles")
    .insert({
      auth_user_id: authUserId,
      email: email ?? null
    })
    .select("*")
    .single();

  if (created.error) throw created.error;
  return created.data;
}
