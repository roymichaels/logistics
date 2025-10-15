# Database Migration Quick Start Guide

## Overview
The production database is now represented by a single baseline migration plus two focused seed files. Fresh environments should apply these three SQL files (in order) to recreate the entire multi-tenant Congress Logistics schema, helper functions, and required seed data.

## Migration Files
1. `supabase/migrations/20251015_000000_init.sql` – Full schema baseline (tables, functions, policies, triggers).
2. `supabase/migrations/20251015_010000_seed_roles.sql` – Canonical role/permission matrix and supporting views.
3. `supabase/migrations/20251015_020000_seed_infrastructure.sql` – Default infrastructure seed.

## Deployment Steps

### Option 1: Supabase CLI (Recommended)
```bash
# 1. Ensure you are authenticated and linked to the project
npx supabase login            # requires SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref <project-ref>

# 2. Apply the baseline and seeds
npx supabase db reset         # drops and rebuilds using supabase/migrations

# 3. Verify schema alignment
npx supabase db diff
```

### Option 2: Supabase Dashboard
1. Go to **Project → SQL Editor**.
2. Execute each file in order: baseline, role seed, infrastructure seed.
3. Confirm tables and policies in Table Editor.

### Option 3: Direct `psql`
```bash
psql "postgresql://postgres:<password>@<project-ref>.supabase.co:5432/postgres" \
  -f supabase/migrations/20251015_000000_init.sql \
  -f supabase/migrations/20251015_010000_seed_roles.sql \
  -f supabase/migrations/20251015_020000_seed_infrastructure.sql
```

## Post-Deployment Checklist
- `SELECT COUNT(*) FROM infrastructures;` returns at least one row (default tenant).
- `SELECT * FROM canonical_role_permissions;` returns four canonical roles with permissions.
- `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';` confirms helper functions installed.
- `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_active_contexts';` validates context table.
- `SELECT policyname FROM pg_policies WHERE tablename = 'orders';` confirms tenant-aware RLS policies.

## Keeping the Baseline Current
Run the automation script whenever the live database drifts from the repo:
```bash
node scripts/collapse-migrations.cjs --stamp 20251015
```
The script dumps the linked database, archives historical migrations in `supabase/migrations_archive/`, and regenerates the baseline + seed files.

For subsequent changes, create new migration files with `npx supabase db diff -f <timestamp>_description.sql` instead of editing the baseline.
