# GiggleBox Dashboard v5 — Repo-Fit Pack

This pack is designed to be merged into an **existing Next.js + Cloudflare + Supabase repo** rather than used as a standalone starter.

## Goal

Fit the child-profile, toy-linking, and telemetry-routing system into your existing platform with minimal reshaping.

## What this pack assumes

- You already have a Next.js app-router project
- You already deploy through Cloudflare Pages/OpenNext or equivalent
- You already use Supabase for auth/data
- You want to add:
  - child profiles
  - device linking
  - telemetry ingestion
  - per-child dashboard overview

## What is included

- merge plan
- file map
- drop-in `src/` modules
- SQL migration
- route handlers
- UI pages/components
- request examples
- environment checklist

## Recommended merge order

1. Run the SQL in `supabase/migrations/001_gigglebox_dashboard.sql`
2. Copy `src/lib/gigglebox/*`
3. Copy `src/types/gigglebox.ts`
4. Copy `src/components/gigglebox/*`
5. Add the route handlers from `src/app/api/*`
6. Add the pages from `src/app/(dashboard)/*`
7. Wire auth helper adapters in `src/lib/gigglebox/auth-adapter.ts`
8. Add env vars
9. Smoke test `/api/health`
10. Test end-to-end pairing flow

## Important note

This is the most practical repo-fit pack I can provide without having your actual repository tree in front of me.
It is designed to reduce chat bloat and give you something mergeable, but you will still need to adapt import paths and your exact auth/layout conventions.
