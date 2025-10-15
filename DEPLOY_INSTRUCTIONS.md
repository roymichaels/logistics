# Deployment Instructions (Supabase Database)

## Summary
The Supabase project now ships with a lean baseline schema and a single seed script. Provisioning a new environment only requires executing two SQL files: `supabase/init_schema.sql` followed by `supabase/seed_data.sql`.

## Prerequisites
- Supabase CLI (`npx supabase --help`)
- Supabase access token (`SUPABASE_ACCESS_TOKEN`)
- Linked project reference (`npx supabase link --project-ref <project-ref>`)

## Standard Deployment
```bash
# Authenticate and link once per environment
npx supabase login
npx supabase link --project-ref <project-ref>

# Rebuild the database schema and apply seeds
psql "$DATABASE_URL" -f supabase/init_schema.sql
psql "$DATABASE_URL" -f supabase/seed_data.sql

# Confirm no drift remains
npx supabase db diff
```

## Manual SQL Deployment (Dashboard)
1. Open **Project → SQL Editor**.
2. Run `supabase/init_schema.sql` to create all tables, enums, and policies.
3. Run `supabase/seed_data.sql` to populate core roles, permissions, and the default infrastructure.
4. Validate that tenant-aware policies, helper functions, and seed data exist.

## Troubleshooting
- **Missing access token:** set `SUPABASE_ACCESS_TOKEN` before running `npx supabase login`.
- **CLI cannot connect:** re-run `npx supabase link --project-ref <project-ref>`.
- **Schema drift detected:** run `npx supabase db diff` to review differences, then `npx supabase db push` for incremental updates.

## Keeping the Baseline Fresh
Use the helper script whenever production schema changes outside this repo:
```bash
node scripts/collapse-migrations.cjs --stamp 20251015
```
This command should now be treated as an archival tool. The canonical schema lives in `supabase/init_schema.sql`; regenerate it by exporting from the live database and copying the relevant statements back into this file.
