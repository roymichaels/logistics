# Deployment Instructions (Supabase Database)

## Summary
The Supabase project now relies on a single consolidated baseline migration plus targeted seed scripts. Always apply the files in `supabase/migrations/` in lexical order to reconstruct the full schema and essential seed data.

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
npx supabase db reset

# Confirm no drift remains
npx supabase db diff
```

## Manual SQL Deployment (Dashboard)
1. Open **Project → SQL Editor**.
2. Run each file from `supabase/migrations/` in order:
   - `20251015_000000_init.sql`
   - `20251015_010000_seed_roles.sql`
   - `20251015_020000_seed_infrastructure.sql`
3. Validate that tenant-aware policies, helper functions, and seed data exist.

## Troubleshooting
- **Missing access token:** set `SUPABASE_ACCESS_TOKEN` before running `npx supabase login`.
- **CLI cannot connect:** re-run `npx supabase link --project-ref <project-ref>`.
- **Schema drift detected:** run `npx supabase db diff` to review differences, then `npx supabase db push` for incremental updates.

## Keeping the Baseline Fresh
Use the helper script whenever production schema changes outside this repo:
```bash
node scripts/collapse-migrations.cjs --stamp 20251015
```
This command dumps the linked database, archives historical migrations in `supabase/migrations_archive/`, and regenerates the baseline + seed files so `npx supabase db reset` stays accurate.
