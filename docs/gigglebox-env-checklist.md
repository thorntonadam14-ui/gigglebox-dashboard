# Environment checklist

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEVICE_API_KEY`
- `PAIRING_CODE_TTL_MINUTES`

Recommended:
- `NEXT_PUBLIC_APP_URL`

## Supabase auth
Add redirect URLs:
- local `/auth/callback`
- production `/auth/callback`

## Cloudflare
Set the same variables in your Cloudflare environment/secrets.
