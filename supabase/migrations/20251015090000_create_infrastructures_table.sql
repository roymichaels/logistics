-- Adds the infrastructures registry used to scope data across tenants.
-- This migration is idempotent so it can be applied safely on existing databases.

set check_function_bodies = off;

create table if not exists public.infrastructures (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  slug text not null,
  display_name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'suspended', 'decommissioned')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (slug)
);

comment on table public.infrastructures is 'Top-level tenant registry for the Congress Logistics platform.';
comment on column public.infrastructures.code is 'Stable short identifier used by automation scripts.';
comment on column public.infrastructures.slug is 'URL friendly identifier for UI routing.';
comment on column public.infrastructures.settings is 'JSON configuration blob for feature toggles and thresholds.';
comment on column public.infrastructures.metadata is 'Arbitrary metadata captured during provisioning.';

create index if not exists idx_infrastructures_status on public.infrastructures(status);
create index if not exists idx_infrastructures_active on public.infrastructures(is_active) where is_active;

-- Ensure updated_at reflects the latest change.
drop trigger if exists trg_infrastructures_set_updated_at on public.infrastructures;

create trigger trg_infrastructures_set_updated_at
  before update on public.infrastructures
  for each row
  execute function public.set_updated_at();

-- Seed the default infrastructure expected by existing deployments.
insert into public.infrastructures (code, slug, display_name, description)
values ('default', 'default', 'Default Infrastructure', 'Initial infrastructure created during migration to multi-tenant core.')
on conflict (code) do update
  set slug = excluded.slug,
      display_name = excluded.display_name,
      description = excluded.description,
      is_active = true,
      status = 'active';
