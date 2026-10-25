-- Prepared for the verified live schema: parent_profiles(id, email, created_at).
-- Do not rerun 001 against production; this is a standalone additive migration.
-- Applied to the authorised production project on 2026-10-25. Do not rerun.
-- No backfill: email matching is not proof of account ownership.
-- A separately authorised process must verify both the authenticated identity
-- and its right to the existing parent record before assigning auth_user_id.
-- Never accept a browser-supplied parent ID as proof or expose unrestricted mapping writes.

BEGIN;

-- Fail rather than silently proceed if the schema changed since inspection.
ALTER TABLE public.parent_profiles
  ADD COLUMN auth_user_id uuid;

-- PostgreSQL permits multiple NULL values: existing parents remain unmapped.
ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_auth_user_id_key UNIQUE (auth_user_id),
  ADD CONSTRAINT parent_profiles_auth_user_id_fkey
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- No UPDATE/INSERT/DELETE, account creation, child reassignment or policy changes.
-- Deleting an Auth user removes access without deleting historical parent/child data.
-- Existing dashboard: auth.getUser() -> auth_user_id -> children.parent_id.
-- No matching parent returns 403; absent/invalid session returns 401.
COMMIT;
