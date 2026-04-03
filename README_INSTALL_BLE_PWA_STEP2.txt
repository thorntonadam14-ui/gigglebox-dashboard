GiggleBox Dashboard - PWA BLE Receiver (Step 2)

Files added/updated:
- app/bluetooth/page.tsx
- app/components/BleReceiverConsole.tsx
- app/layout.tsx
- app/page.tsx
- app/dashboard/page.tsx
- app/setup/page.tsx

What this adds:
- a new /bluetooth page for parent-side Web Bluetooth
- PWA service-worker registrar enabled in layout
- live BLE log console
- connect/disconnect UI
- optional relay of recognised BLE telemetry payloads into /api/telemetry
- simple write-packet box for HELLO / LINK_DEVICE style commands later

Install:
1. Replace the files in your dashboard project with these files.
2. Restart the dashboard:
   npm run dev
3. Open /bluetooth in Chrome/Edge on HTTPS (or localhost for local testing).
4. Tap Connect BLE.
5. If toy-side UUIDs change later, update the three UUID fields in the UI.

Notes:
- This page is the parent/PWA receiver side only.
- It does not replace the toy-side BLE work.
- If no packets appear yet, that means the toy is not notifying real BLE event payloads yet.
