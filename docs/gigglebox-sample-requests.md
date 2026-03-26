# Sample requests

## Health
```bash
curl http://localhost:3000/api/health
```

## Claim code from toy
```bash
curl -X POST http://localhost:3000/api/device/claim-code \
  -H "Content-Type: application/json" \
  -H "x-device-api-key: replace-with-a-long-random-secret" \
  -d '{"serialNumber":"GBX-100042","deviceName":"Bedroom Toy","code":"483291"}'
```

## Send telemetry
```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-device-api-key: replace-with-a-long-random-secret" \
  -d '{
    "serialNumber":"GBX-100042",
    "eventType":"ASKME_INPUT",
    "occurredAt":"2026-03-26T10:44:18Z",
    "payload":{"text":"Why is the moon following me?","emotion":"curious","flaggedConcern":false}
  }'
```
