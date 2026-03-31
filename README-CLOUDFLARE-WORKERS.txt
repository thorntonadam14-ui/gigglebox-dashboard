Replace these files in your dashboard repo.

Also do this one cleanup step:
- delete package-lock.json from the repo before commit/push

Then in Cloudflare for this project:
1. Settings -> Builds & deployments
2. Framework preset: None
3. Build command: npm run build
4. Build output directory: .open-next/assets
5. Root directory: /
6. Keep the Supabase env vars already added
7. Retry deployment

What this zip changes:
- switches the dashboard from static Pages asset output to the Cloudflare OpenNext worker build
- keeps Next.js app routes and API routes working
- keeps the child detail page params fix
- keeps telemetry route env lookup safe at runtime

What this does NOT change:
- toy sync logic
- Supabase schema
- BLE plan
