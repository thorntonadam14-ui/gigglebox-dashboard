Drop these folders into your project so you get:

app/api/pairing-code/route.ts
app/api/device/link/route.ts

Then restart:
Ctrl + C
npm run dev

Test flow:

1) Generate pairing code
curl -X POST http://localhost:3000/api/pairing-code \
  -H "Content-Type: application/json" \
  -d '{"childId":"PUT_CHILD_ID_HERE"}'

2) Link toy/device using returned code
curl -X POST http://localhost:3000/api/device/link \
  -H "Content-Type: application/json" \
  -d '{"code":"PUT_CODE_HERE","serialNumber":"GBX-1001","deviceName":"Bedroom Toy"}'

Check Supabase tables:
- device_pairing_codes
- devices
- child_device_links
