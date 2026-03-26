Drop this into your project so the file ends up here:

app/api/children/route.ts

Then restart your dev server:
Ctrl + C
npm run dev

Test in browser:
http://localhost:3000/api/children

Test create in Terminal:
curl -X POST http://localhost:3000/api/children \
  -H "Content-Type: application/json" \
  -d '{"name":"Georgie","age":6}'
