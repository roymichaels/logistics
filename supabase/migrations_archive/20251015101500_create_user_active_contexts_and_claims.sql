-- Establishes unified active-context tracking and custom JWT claims
-- for multi-tenant awareness across infrastructures and businesses.

set check_function_bodies = off;

-- Create the user_active_contexts table if it does not exist yet.
create table if not exists public.user_active_contexts (
  user_id uuid primary key references public.users(id) on delete cascade,
  infrastructure_id uuid not null references public.infrastructures(id),
  business_id uuid references public.businesses(id),
  context_version integer not null default 1,
  last_switched_at timestamptz not null default now(),
  session_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_active_contexts is 'Tracks the caller''s active infrastructure + business scope for JWT claims.';
comment on column public.user_active_contexts.context_version is 'Bumps every time the user switches context to invalidate caches.';
comment on column public.user_active_contexts.session_metadata is 'Arbitrary metadata about the most recent context switch event.';

-- Keep timestamps fresh on updates.
drop trigger if exists trg_user_active_contexts_set_updated_at on public.user_active_contexts;
create trigger trg_user_active_contexts_set_updated_at
  before update on public.user_active_contexts
  for each row
  execute function public.set_updated_at();

-- Ensure indexes exist for tenant scoped lookups.
create index if not exists idx_user_active_contexts_infra on public.user_active_contexts(infrastructure_id);
create index if not exists idx_user_active_contexts_business on public.user_active_contexts(business_id);

-- Backfill data from legacy user_business_context table when present.
do $$
declare
  v_default_infra uuid;
begin
  select id into v_default_infra
  from public.infrastructures
  order by created_at asc
  limit 1;

  if v_default_infra is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Created while provisioning user contexts')
    returning id into v_default_infra;
  end if;

  if to_regclass('public.user_business_context') is not null then
    insert into public.user_active_contexts (user_id, infrastructure_id, business_id, context_version, last_switched_at, session_metadata)
    select
      ubc.user_id,
      coalesce(b.infrastructure_id, v_default_infra),
      ubc.active_business_id,
      1,
      coalesce(ubc.last_switched_at, now()),
      coalesce(ubc.session_metadata, '{}'::jsonb)
    from public.user_business_context ubc
    left join public.businesses b on b.id = ubc.active_business_id
    on conflict (user_id) do update set
      infrastructure_id = excluded.infrastructure_id,
      business_id = excluded.business_id,
      last_switched_at = excluded.last_switched_at,
      session_metadata = excluded.session_metadata;
  end if;

  insert into public.user_active_contexts (user_id, infrastructure_id)
  select u.id, v_default_infra
  from public.users u
  where not exists (
    select 1 from public.user_active_contexts uac where uac.user_id = u.id
  );
end $$;

-- Apply RLS so callers can only access their own context entry.
alter table public.user_active_contexts enable row level security;

drop policy if exists "Users manage own active context" on public.user_active_contexts;
create policy "Users manage own active context"
  on public.user_active_contexts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Anon blocked from active context" on public.user_active_contexts;
create policy "Anon blocked from active context"
  on public.user_active_contexts for select
  to anon
  using (false);

-- Helper to set the active context and bump version atomically.
create or replace function public.set_user_active_context(
  p_user_id uuid,
  p_infrastructure_id uuid,
  p_business_id uuid default null,
  p_session_metadata jsonb default '{}'::jsonb
)
returns public.user_active_contexts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_active_contexts%rowtype;
begin
  if p_user_id is null then
    raise exception 'set_user_active_context requires a user_id';
  end if;

  if p_infrastructure_id is null then
    raise exception 'set_user_active_context requires an infrastructure_id';
  end if;

  insert into public.user_active_contexts as uac (
    user_id,
    infrastructure_id,
    business_id,
    context_version,
    last_switched_at,
    session_metadata
  ) values (
    p_user_id,
    p_infrastructure_id,
    p_business_id,
    1,
    now(),
    coalesce(p_session_metadata, '{}'::jsonb)
  )
  on conflict (user_id) do update set
    infrastructure_id = excluded.infrastructure_id,
    business_id = excluded.business_id,
    context_version = uac.context_version + 1,
    last_switched_at = now(),
    session_metadata = coalesce(excluded.session_metadata, '{}'::jsonb),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_user_active_context(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.set_user_active_context(uuid, uuid, uuid, jsonb) to authenticated;

-- Read helper used by diagnostics and audit tooling.
create or replace function public.get_user_active_context(p_user_id uuid)
returns table (
  user_id uuid,
  infrastructure_id uuid,
  business_id uuid,
  context_version integer,
  last_switched_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    uac.user_id,
    uac.infrastructure_id,
    uac.business_id,
    uac.context_version,
    uac.last_switched_at
  from public.user_active_contexts uac
  where uac.user_id = p_user_id;
$$;

grant execute on function public.get_user_active_context(uuid) to authenticated;

-- Custom JWT claims used by Supabase when minting access tokens.
create or replace function auth.jwt_custom_claims()
returns jsonb
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_context public.user_active_contexts%rowtype;
  v_business_role text;
  v_default_infra uuid;
begin
  if v_user_id is null then
    return '{}'::jsonb;
  end if;

  select id into v_default_infra
  from public.infrastructures
  order by created_at asc
  limit 1;

  select role into v_role
  from public.users
  where id = v_user_id;

  select * into v_context
  from public.user_active_contexts
  where user_id = v_user_id;

  if v_context.user_id is null then
    v_context.user_id := v_user_id;
    v_context.infrastructure_id := coalesce(v_default_infra, null);
    v_context.context_version := 1;
  end if;

  if v_context.business_id is not null then
    select r.role_key into v_business_role
    from public.user_business_roles ubr
    join public.roles r on r.id = ubr.role_id
    where ubr.user_id = v_user_id
      and ubr.business_id = v_context.business_id
      and ubr.is_active = true
    limit 1;
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'role', v_role,
    'infrastructure_id', v_context.infrastructure_id,
    'business_id', v_context.business_id,
    'business_role', v_business_role,
    'context_version', coalesce(v_context.context_version, 1),
    'context_refreshed_at', v_context.last_switched_at
  );
end;
$$;

grant execute on function auth.jwt_custom_claims() to authenticated;

grant usage on schema auth to authenticated;
