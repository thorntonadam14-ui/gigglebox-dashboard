# UI Update Pack

This pack includes:
- upgraded dashboard API
- upgraded dashboard page
- upgraded children page
- new child detail page
- updated home page links

## Files included
- app/api/dashboard/overview/route.ts
- app/dashboard/page.tsx
- app/children/page.tsx
- app/children/[id]/page.tsx
- app/page.tsx

## Install
1. Unzip
2. Merge the `app/` folder into your project
3. Replace older files when prompted
4. Restart:
   `Ctrl + C`
   `npm run dev`

## Pages
- `/`
- `/dashboard`
- `/children`
- `/children/[id]`

## Good next telemetry tests

### Emotion
```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"PUT_DEVICE_ID_HERE","eventType":"emotion_state","payload":{"emotion":"happy"}}'
```

### Coloring save
```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"PUT_DEVICE_ID_HERE","eventType":"coloring_saved","payload":{"imageUrl":"saved-drawing-001.png","page":"dragon","title":"Blue Dragon"}}'
```

### Ask Me / prompt style
```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"PUT_DEVICE_ID_HERE","eventType":"ask_me","payload":{"text":"I had fun today","emotion":"happy"}}'
```
