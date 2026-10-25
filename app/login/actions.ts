"use server";

import { redirect } from "next/navigation";
import { getBrowserlessSupabaseServerClient } from "../../src/lib/gigglebox/auth-adapter";

function destination(form: FormData) {
  const next = String(form.get("next") ?? "");
  return /^\/children(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i.test(next) ? next : "/children";
}

export async function signIn(form: FormData) {
  const next = destination(form);
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  let ok = false;
  if (email && password) {
    try {
      const client = await getBrowserlessSupabaseServerClient();
      const result = await client.auth.signInWithPassword({ email, password });
      if (!result.error) {
        const verified = await client.auth.getUser();
        ok = !verified.error && Boolean(verified.data.user);
      }
    } catch { /* Never expose credentials or provider details. */ }
  }
  if (!ok) redirect(`/login?status=failed&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  let ok = false;
  if (email && password) {
    try {
      const client = await getBrowserlessSupabaseServerClient();
      // Supabase's configured confirmation policy remains authoritative.
      // No parent record is created or linked here.
      const result = await client.auth.signUp({ email, password });
      ok = !result.error;
    } catch { /* No sensitive error details in the page or logs. */ }
  }
  redirect(ok ? "/login?status=confirm" : "/login?status=signup-failed");
}
