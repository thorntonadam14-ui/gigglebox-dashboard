Replace this file in your dashboard repo:

- app/page.tsx

What changed:
- Removed dependency on NEXT_PUBLIC_APP_URL for the home page status check
- Uses request headers to build the current site URL safely on Vercel
- Keeps the existing redirect logic:
  - ready -> /dashboard
  - not ready -> /setup
