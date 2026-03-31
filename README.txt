Replace this file in your dashboard repo:
- app/children/[id]/page.tsx

What changed:
- Updated Next.js 15 page params typing to use Promise params with React use()
- This only fixes the build-time route typing issue
- It does not change sync, telemetry, API routes, or Supabase logic
