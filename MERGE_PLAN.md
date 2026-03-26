# Merge plan

## 1. Keep your existing app shell
Do not replace your current root layout.

Only merge:
- dashboard child management pages
- dashboard overview page
- API routes
- Supabase/data helpers

## 2. Use these route groups
Recommended placement in your real repo:

- `src/app/(dashboard)/children/page.tsx`
- `src/app/(dashboard)/children/new/page.tsx`
- `src/app/(dashboard)/children/[childId]/link/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`

If your repo already has a dashboard namespace, move these under your existing route group.

## 3. Adapt auth in one place only
The only file you should need to customize immediately is:

- `src/lib/gigglebox/auth-adapter.ts`

It is intentionally isolated so you can connect:
- your existing Supabase session helper
- your current parent account bootstrap
- your existing middleware/session refresh

## 4. Keep toy routes server-only
These routes should stay protected and never use client-side secrets:

- `/api/device/claim-code`
- `/api/telemetry`

## 5. Phase-in strategy
### Phase A
- DB schema
- child pages
- pairing code routes
- link-status route

### Phase B
- toy claim route
- telemetry ingestion

### Phase C
- dashboard overview
- alerts
