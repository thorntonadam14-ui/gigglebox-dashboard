Drop these files into your project so you get:

app/api/dashboard/overview/route.ts
app/dashboard/page.tsx
app/page.tsx

Then restart:
Ctrl + C
npm run dev

Visit:
http://localhost:3000/dashboard

This dashboard already supports:
- summary cards
- recent activity feed
- emotion breakdown
- latest coloring save placeholder

To test emotion telemetry:
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"PUT_DEVICE_ID_HERE","eventType":"emotion_state","payload":{"emotion":"happy"}}'

To test coloring save telemetry:
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"PUT_DEVICE_ID_HERE","eventType":"coloring_saved","payload":{"imageUrl":"saved-drawing-001.png","page":"dragon"}}'
