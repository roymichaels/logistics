-- Provides reusable helper functions for tenant-aware RLS policies.
set check_function_bodies = off;

create or replace function public.current_infrastructure_id()
returns uuid
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'infrastructure_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'infrastructure_id', '')::uuid,
    (
      select infrastructure_id
      from public.user_active_contexts
      where user_id = auth.uid()
    )
  );
$$;

comment on function public.current_infrastructure_id() is 'Returns the caller''s active infrastructure identifier derived from JWT claims or active context.';

grant execute on function public.current_infrastructure_id() to authenticated, anon, service_role;

create or replace function public.current_business_id()
returns uuid
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'business_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'business_id', '')::uuid,
    (
      select business_id
      from public.user_active_contexts
      where user_id = auth.uid()
    )
  );
$$;

comment on function public.current_business_id() is 'Returns the caller''s active business identifier derived from JWT claims or active context.';

grant execute on function public.current_business_id() to authenticated, anon, service_role;

create or replace function public.current_infrastructure_role()
returns text
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')
  );
$$;

comment on function public.current_infrastructure_role() is 'Returns the infrastructure-level role supplied in the caller''s JWT.';

grant execute on function public.current_infrastructure_role() to authenticated, anon, service_role;

create or replace function public.current_business_role()
returns text
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'business_role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'business_role', '')
  );
$$;

comment on function public.current_business_role() is 'Returns the active business-scoped role supplied in the caller''s JWT.';

grant execute on function public.current_business_role() to authenticated, anon, service_role;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_role is null then false
    else lower(coalesce(public.current_infrastructure_role(), '')) = lower(p_role)
      or lower(coalesce(public.current_business_role(), '')) = lower(p_role)
  end;
$$;

comment on function public.has_role(text) is 'Checks whether the caller matches the provided role across infrastructure or business scope.';

grant execute on function public.has_role(text) to authenticated, anon, service_role;

create or replace function public.has_any_role(p_roles text[])
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from unnest(coalesce(p_roles, array[]::text[])) as r(role)
    where public.has_role(r.role)
  );
$$;

comment on function public.has_any_role(text[]) is 'Returns true when any requested role matches the caller.';

grant execute on function public.has_any_role(text[]) to authenticated, anon, service_role;

create or replace function public.has_infrastructure_role(p_role text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_role is null then false
    else lower(coalesce(public.current_infrastructure_role(), '')) = lower(p_role)
  end;
$$;

comment on function public.has_infrastructure_role(text) is 'Returns true when the caller holds the provided infrastructure-level role.';

grant execute on function public.has_infrastructure_role(text) to authenticated, anon, service_role;

create or replace function public.has_any_infrastructure_role(p_roles text[])
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from unnest(coalesce(p_roles, array[]::text[])) as r(role)
    where public.has_infrastructure_role(r.role)
  );
$$;

comment on function public.has_any_infrastructure_role(text[]) is 'Returns true when the caller has any infrastructure-level role in the provided list.';

grant execute on function public.has_any_infrastructure_role(text[]) to authenticated, anon, service_role;

create or replace function public.has_business_role(p_business_id uuid, p_roles text[] default null)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_roles text[] := p_roles;
begin
  if p_business_id is null then
    return false;
  end if;

  if v_roles is null then
    return exists (
      select 1
      from public.user_business_roles ubr
      where ubr.user_id = auth.uid()
        and ubr.business_id = p_business_id
        and ubr.is_active = true
    );
  end if;

  return exists (
    select 1
    from public.user_business_roles ubr
    join public.roles r on r.id = ubr.role_id
    where ubr.user_id = auth.uid()
      and ubr.business_id = p_business_id
      and ubr.is_active = true
      and r.role_key = any(v_roles)
  );
end;
$$;

comment on function public.has_business_role(uuid, text[]) is 'Checks if the caller has an active assignment for the provided business and optional role filters.';

grant execute on function public.has_business_role(uuid, text[]) to authenticated, anon, service_role;

create or replace function public.is_infrastructure_admin(p_infrastructure_id uuid default null)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.has_any_infrastructure_role(array['infrastructure_owner', 'infrastructure_manager'])
    and (
      p_infrastructure_id is null
      or public.current_infrastructure_id() is null
      or public.current_infrastructure_id() = p_infrastructure_id
    );
$$;

comment on function public.is_infrastructure_admin(uuid) is 'Determines if the caller is an infrastructure_owner or infrastructure_manager within the provided infrastructure.';

grant execute on function public.is_infrastructure_admin(uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_access(
  p_infrastructure_id uuid,
  p_business_id uuid default null
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_current_infra uuid := public.current_infrastructure_id();
begin
  if p_infrastructure_id is null then
    return false;
  end if;

  if v_current_infra is null or v_current_infra <> p_infrastructure_id then
    return false;
  end if;

  if p_business_id is null then
    return true;
  end if;

  if public.is_infrastructure_admin(p_infrastructure_id) then
    return true;
  end if;

  return public.has_business_role(p_business_id);
end;
$$;

comment on function public.tenant_can_access(uuid, uuid) is 'Evaluates whether the caller can access the provided infrastructure/business row.';

grant execute on function public.tenant_can_access(uuid, uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_manage_business(
  p_infrastructure_id uuid,
  p_business_id uuid default null
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if public.is_infrastructure_admin(p_infrastructure_id) then
    return true;
  end if;

  if p_business_id is null then
    return false;
  end if;

  return public.has_business_role(p_business_id, array['business_owner', 'manager']);
end;
$$;

comment on function public.tenant_can_manage_business(uuid, uuid) is 'Allows infrastructure admins and business owners/managers to modify business-scoped records.';

grant execute on function public.tenant_can_manage_business(uuid, uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_access_infrastructure(p_infrastructure_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if p_infrastructure_id is null then
    return false;
  end if;

  if public.current_infrastructure_id() is null then
    return false;
  end if;

  if public.current_infrastructure_id() <> p_infrastructure_id then
    return false;
  end if;

  return public.is_infrastructure_admin(p_infrastructure_id);
end;
$$;

comment on function public.tenant_can_access_infrastructure(uuid) is 'Restricts infrastructure-level tables to administrators of the same tenant.';

grant execute on function public.tenant_can_access_infrastructure(uuid) to authenticated, anon, service_role;

-- Ensure legacy helpers use the new predicates.
create or replace function is_infra_owner_from_jwt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_infrastructure_role('infrastructure_owner');
$$;

grant execute on function is_infra_owner_from_jwt() to authenticated, anon, service_role;

