create extension if not exists pgcrypto;

create table if not exists public.parent_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  name text not null,
  nickname text,
  age integer,
  avatar_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null unique,
  device_name text,
  firmware_version text,
  status text not null default 'unlinked',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_status_check check (status in ('unlinked', 'linked', 'inactive'))
);

create table if not exists public.device_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  code text not null unique,
  status text not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz,
  claimed_device_id uuid references public.devices(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint pairing_status_check check (status in ('active', 'used', 'expired', 'cancelled'))
);

create table if not exists public.child_device_links (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  is_active boolean not null default true
);

create unique index if not exists uq_active_device_link
on public.child_device_links (device_id)
where is_active = true;

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete restrict,
  child_id uuid references public.children(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  telemetry_event_id uuid references public.telemetry_events(id) on delete set null,
  severity text not null,
  alert_type text not null,
  summary text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint alerts_severity_check check (severity in ('low', 'medium', 'high')),
  constraint alerts_status_check check (status in ('open', 'acknowledged', 'resolved'))
);
