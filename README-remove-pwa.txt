This pack removes the PWA dependency from the layout so the app can boot cleanly again.

It replaces:
- app/layout.tsx

Optional cleanup after the app is working again:
- delete components/PwaRegistrar.tsx if it exists
- delete components/InstallPrompt.tsx if it exists
- delete public/sw.js if it exists
- delete app/manifest.ts if it exists
- delete public/icons/ if you do not want the PWA assets anymore

Install:
1. Unzip
2. Replace app/layout.tsx
3. Restart:
   npm run dev
