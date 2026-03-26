This pack adds a basic installable Progressive Web App layer.

Included:
- app/manifest.ts
- app/layout.tsx
- components/PwaRegistrar.tsx
- components/InstallPrompt.tsx
- public/sw.js
- public/icons/icon-192.png
- public/icons/icon-512.png
- public/icons/icon-maskable-512.png

What it gives you:
- installable app manifest
- service worker registration
- basic offline shell caching
- mobile/desktop install readiness
- Apple web app metadata

Important:
- localhost can be used for testing service workers
- install prompts are most reliable in Chrome/Edge
- true production PWA testing is best after deploy on HTTPS
- if you already customized app/layout.tsx heavily, merge carefully

Optional:
- import and place <InstallPrompt /> in your setup or dashboard page to show an install button
