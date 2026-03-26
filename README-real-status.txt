This pack wires the home page to real Supabase-backed status.

It adds:
- app/api/status/route.ts
- app/page.tsx

What it does:
- checks if children exist
- checks if devices exist
- checks if child-device links exist
- if all are present, home redirects to /dashboard
- otherwise, home redirects to /setup

Install:
1. Unzip
2. Merge into your project
3. Replace old files
4. Restart:
   npm run dev

Test:
- remove or add rows in Supabase
- visit /
- it should route correctly based on actual data

After this:
yes — the next important step is testing with the actual toy, because then we validate the real sync/input path rather than just simulated curl calls.
