-- Locks down audit tables so only administrators within the same infrastructure can read/write entries.
set check_function_bodies = off;

do $$
declare
  policy_name text;
begin
  if to_regclass('public.system_audit_log') is not null then
    perform 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'system_audit_log' and column_name = 'infrastructure_id';

    if found then
      perform public.current_infrastructure_id(); -- ensure helper exists before applying policies

      for policy_name in
        select policyname from pg_policies where schemaname = 'public' and tablename = 'system_audit_log'
      loop
        execute format('drop policy "%s" on public.system_audit_log;', policy_name);
      end loop;

      execute 'alter table public.system_audit_log enable row level security;';

      execute 'create policy "Tenant audit access" on public.system_audit_log for select to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Tenant audit modify" on public.system_audit_log for all to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id")) with check (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Anon blocked (system_audit_log)" on public.system_audit_log for select to anon using (false);';
      execute 'create policy "Service role (system_audit_log) bypass" on public.system_audit_log for all to service_role using (true) with check (true);';
    end if;
  end if;

  if to_regclass('public.cross_scope_access_log') is not null then
    perform 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cross_scope_access_log' and column_name = 'infrastructure_id';

    if found then
      for policy_name in
        select policyname from pg_policies where schemaname = 'public' and tablename = 'cross_scope_access_log'
      loop
        execute format('drop policy "%s" on public.cross_scope_access_log;', policy_name);
      end loop;

      execute 'alter table public.cross_scope_access_log enable row level security;';

      execute 'create policy "Tenant cross-scope audit access" on public.cross_scope_access_log for select to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Tenant cross-scope audit insert" on public.cross_scope_access_log for insert to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id")) with check (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Anon blocked (cross_scope_access_log)" on public.cross_scope_access_log for select to anon using (false);';
      execute 'create policy "Service role (cross_scope_access_log) bypass" on public.cross_scope_access_log for all to service_role using (true) with check (true);';
    end if;
  end if;
end $$;
