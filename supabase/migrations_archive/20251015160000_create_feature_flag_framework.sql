-- Introduces tenant-scoped feature flag framework and helper functions.
set check_function_bodies = off;

create table if not exists public.feature_flags (
  feature_key text primary key,
  display_name text not null,
  description text,
  default_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is 'Catalog of globally defined feature flags available to all infrastructures.';
comment on column public.feature_flags.feature_key is 'Stable identifier referenced by infrastructure overrides and clients.';
comment on column public.feature_flags.default_enabled is 'Default activation state applied when no tenant override exists.';

-- Maintain updated_at timestamp.
drop trigger if exists trg_feature_flags_set_updated_at on public.feature_flags;
create trigger trg_feature_flags_set_updated_at
  before update on public.feature_flags
  for each row
  execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy if not exists "Feature flags readable"
  on public.feature_flags
  for select
  to authenticated
  using (true);

create policy if not exists "Feature flags anon blocked"
  on public.feature_flags
  for select
  to anon
  using (false);

create policy if not exists "Feature flags managed by service"
  on public.feature_flags
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.infrastructure_feature_flags (
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  feature_key text not null references public.feature_flags(feature_key) on delete cascade,
  enabled boolean not null,
  notes text,
  overridden_by uuid,
  overridden_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (infrastructure_id, feature_key)
);

comment on table public.infrastructure_feature_flags is 'Tenant-specific overrides for feature flags.';
comment on column public.infrastructure_feature_flags.enabled is 'Override state applied for the tenant when present.';
comment on column public.infrastructure_feature_flags.overridden_by is 'Optional reference to the user that last changed the override.';

create index if not exists idx_infrastructure_feature_flags_feature
  on public.infrastructure_feature_flags(feature_key, infrastructure_id);

create index if not exists idx_infrastructure_feature_flags_infra
  on public.infrastructure_feature_flags(infrastructure_id);

-- Maintain updated_at timestamp.
drop trigger if exists trg_infrastructure_feature_flags_updated_at on public.infrastructure_feature_flags;
create trigger trg_infrastructure_feature_flags_updated_at
  before update on public.infrastructure_feature_flags
  for each row
  execute function public.set_updated_at();

alter table public.infrastructure_feature_flags enable row level security;

create policy if not exists "Tenant feature flag select"
  on public.infrastructure_feature_flags
  for select
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant feature flag modify"
  on public.infrastructure_feature_flags
  for all
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id))
  with check (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant feature flag anon blocked"
  on public.infrastructure_feature_flags
  for select
  to anon
  using (false);

create policy if not exists "Tenant feature flag service bypass"
  on public.infrastructure_feature_flags
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_feature_flag_override_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.overridden_by is null then
    new.overridden_by := auth.uid();
  end if;

  if new.overridden_at is null then
    new.overridden_at := now();
  end if;

  return new;
end;
$$;

comment on function public.set_feature_flag_override_metadata() is 'Ensures infrastructure feature flag overrides capture actor metadata.';

drop trigger if exists trg_infrastructure_feature_flags_metadata on public.infrastructure_feature_flags;
create trigger trg_infrastructure_feature_flags_metadata
  before insert or update on public.infrastructure_feature_flags
  for each row
  execute function public.set_feature_flag_override_metadata();

create or replace function public.is_feature_enabled(
  p_feature_key text,
  p_infrastructure_id uuid default public.current_infrastructure_id()
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select iff.enabled
      from public.infrastructure_feature_flags iff
      where iff.feature_key = p_feature_key
        and iff.infrastructure_id = coalesce(p_infrastructure_id, public.current_infrastructure_id())
      limit 1
    ),
    (
      select ff.default_enabled
      from public.feature_flags ff
      where ff.feature_key = p_feature_key
      limit 1
    ),
    false
  );
$$;

comment on function public.is_feature_enabled(text, uuid) is 'Evaluates the effective feature flag state for the provided tenant and flag key.';

grant execute on function public.is_feature_enabled(text, uuid) to authenticated, anon, service_role;

create or replace function public.list_feature_flags(
  p_infrastructure_id uuid default public.current_infrastructure_id()
)
returns table (
  infrastructure_id uuid,
  feature_key text,
  display_name text,
  description text,
  is_enabled boolean,
  default_enabled boolean,
  has_override boolean,
  override_enabled boolean,
  overridden_at timestamptz,
  overridden_by uuid
)
language sql
stable
set search_path = public
as $$
  select
    coalesce(p_infrastructure_id, public.current_infrastructure_id()) as infrastructure_id,
    ff.feature_key,
    ff.display_name,
    ff.description,
    coalesce(iff.enabled, ff.default_enabled) as is_enabled,
    ff.default_enabled,
    (iff.feature_key is not null) as has_override,
    iff.enabled as override_enabled,
    iff.overridden_at,
    iff.overridden_by
  from public.feature_flags ff
  left join public.infrastructure_feature_flags iff
    on iff.feature_key = ff.feature_key
   and iff.infrastructure_id = coalesce(p_infrastructure_id, public.current_infrastructure_id());
$$;

comment on function public.list_feature_flags(uuid) is 'Returns effective feature flag states for the requested infrastructure.';

grant execute on function public.list_feature_flags(uuid) to authenticated, anon, service_role;

-- Seed baseline feature flags that align with near-term roadmap items.
insert into public.feature_flags (feature_key, display_name, description, default_enabled)
values
  ('advanced_reporting', 'Advanced Reporting', 'Enables extended KPI dashboards and export capabilities.', false),
  ('driver_chat', 'Driver Chat', 'Allows drivers to exchange secure messages with dispatch.', false),
  ('automated_alerting', 'Automated Alerting', 'Sends proactive notifications for delayed deliveries and low stock.', true)
on conflict (feature_key) do update
  set display_name = excluded.display_name,
      description = excluded.description,
      default_enabled = excluded.default_enabled,
      metadata = excluded.metadata,
      updated_at = now();
