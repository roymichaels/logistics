-- Adds infrastructure scoping to the user_permissions_cache table so cached entries
-- respect multi-tenant boundaries.
set check_function_bodies = off;

do $$
declare
  v_default_infrastructure uuid;
  policy_name text;
begin
  select id
  into v_default_infrastructure
  from public.infrastructures
  order by created_at asc
  limit 1;

  if v_default_infrastructure is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Created while backfilling user_permissions_cache')
    returning id into v_default_infrastructure;
  end if;

  alter table if exists public.user_permissions_cache
    add column if not exists infrastructure_id uuid;

  update public.user_permissions_cache upc
  set infrastructure_id = b.infrastructure_id
  from public.businesses b
  where upc.business_id = b.id
    and upc.infrastructure_id is null;

  update public.user_permissions_cache upc
  set infrastructure_id = uac.infrastructure_id
  from public.user_active_contexts uac
  where upc.user_id = uac.user_id
    and upc.infrastructure_id is null;

  update public.user_permissions_cache
  set infrastructure_id = v_default_infrastructure
  where infrastructure_id is null;

  alter table public.user_permissions_cache
    alter column infrastructure_id set not null;

  alter table public.user_permissions_cache
    add constraint user_permissions_cache_infrastructure_id_fkey
    foreign key (infrastructure_id) references public.infrastructures(id)
    on delete cascade;

  if exists (
    select 1
    from pg_constraint
    where conname = 'user_permissions_cache_user_id_business_id_key'
      and conrelid = 'public.user_permissions_cache'::regclass
  ) then
    alter table public.user_permissions_cache
      drop constraint user_permissions_cache_user_id_business_id_key;
  end if;

  begin
    alter table public.user_permissions_cache
      add constraint user_permissions_cache_user_scope_key
      unique (user_id, infrastructure_id, business_id);
  exception
    when duplicate_object then
      -- Constraint already exists, nothing to do.
      null;
  end;

  -- Refresh policies to ensure tenant-aware enforcement.
  if to_regclass('public.user_permissions_cache') is not null then
    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = 'user_permissions_cache'
    loop
      execute format('drop policy "%s" on public.user_permissions_cache;', policy_name);
    end loop;

    execute 'alter table public.user_permissions_cache enable row level security;';

    execute 'create policy "Users read own cache" on public.user_permissions_cache for select to authenticated using (user_id = auth.uid() and public.tenant_can_access_infrastructure(infrastructure_id));';
    execute 'create policy "Users manage own cache" on public.user_permissions_cache for all to authenticated using (public.tenant_can_access_infrastructure(infrastructure_id)) with check (public.tenant_can_access_infrastructure(infrastructure_id));';
    execute 'create policy "Anon blocked (user_permissions_cache)" on public.user_permissions_cache for select to anon using (false);';
    execute 'create policy "Service role (user_permissions_cache) bypass" on public.user_permissions_cache for all to service_role using (true) with check (true);';
  end if;
end $$;

