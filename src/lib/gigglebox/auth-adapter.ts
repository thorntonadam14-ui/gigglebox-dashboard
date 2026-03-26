/**
 * REPO-FIT ADAPTER
 *
 * Replace the internals of these functions to match your existing auth + Supabase setup.
 * Keep the signatures stable so the rest of the pack does not need to change.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

export async function getBrowserlessSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // ignored in server components
        }
      }
    }
  });
}

export async function getCurrentParentUser() {
  const supabase = await getBrowserlessSupabaseServerClient();
  const result = await supabase.auth.getUser();
  return result.data.user ?? null;
}

export function getSupabaseAdminClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
