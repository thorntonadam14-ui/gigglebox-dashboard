# File map

## Add to existing repo

src/
  app/
    api/
      health/route.ts
      children/route.ts
      children/[childId]/pairing-code/route.ts
      children/[childId]/link-status/route.ts
      device/claim-code/route.ts
      telemetry/route.ts
      dashboard/overview/route.ts
    (dashboard)/
      children/page.tsx
      children/new/page.tsx
      children/[childId]/link/page.tsx
      dashboard/page.tsx
  components/
    gigglebox/
      ChildForm.tsx
      ChildrenList.tsx
      DashboardOverview.tsx
      PairingFlow.tsx
  lib/
    gigglebox/
      auth-adapter.ts
      children.ts
      dashboard.ts
      devices.ts
      env.ts
      parents.ts
      security.ts
      telemetry.ts
      utils.ts
  types/
    gigglebox.ts

supabase/
  migrations/
    001_gigglebox_dashboard.sql

docs/
  gigglebox-sample-requests.md
  gigglebox-env-checklist.md
