-- Ensures all audit tables carry infrastructure scope and remain append-only.
set check_function_bodies = off;

do $$
declare
  v_default_infrastructure uuid;
begin
  select id
    into v_default_infrastructure
    from public.infrastructures
    order by created_at
    limit 1;

  if v_default_infrastructure is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Seeded automatically for tenant-scoped audits')
    returning id into v_default_infrastructure;
  end if;

  -- System audit log
  if to_regclass('public.system_audit_log') is not null then
    execute 'alter table public.system_audit_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.system_audit_log sal
         set infrastructure_id = coalesce(sal.infrastructure_id, b.infrastructure_id, %L::uuid)
        from public.businesses b
       where sal.business_id = b.id
         and sal.infrastructure_id is distinct from b.infrastructure_id',
      v_default_infrastructure
    );
    execute format(
      'update public.system_audit_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1
      from pg_constraint
      where conname = 'system_audit_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.system_audit_log
                 add constraint system_audit_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.system_audit_log alter column infrastructure_id set not null';
  end if;

  -- Financial audit log
  if to_regclass('public.financial_audit_log') is not null then
    execute 'alter table public.financial_audit_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.financial_audit_log fal
          set infrastructure_id = coalesce(fal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where fal.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.financial_audit_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1
      from pg_constraint
      where conname = 'financial_audit_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.financial_audit_log
                 add constraint financial_audit_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.financial_audit_log alter column infrastructure_id set not null';
  end if;

  -- Cross scope access log (joins on target business)
  if to_regclass('public.cross_scope_access_log') is not null then
    execute 'alter table public.cross_scope_access_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.cross_scope_access_log csal
          set infrastructure_id = coalesce(csal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where csal.target_business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.cross_scope_access_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'cross_scope_access_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.cross_scope_access_log
                 add constraint cross_scope_access_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.cross_scope_access_log alter column infrastructure_id set not null';
    execute 'create index if not exists idx_cross_scope_access_log_infrastructure_id on public.cross_scope_access_log(infrastructure_id)';
  end if;

  -- Data export log
  if to_regclass('public.data_export_log') is not null then
    execute 'alter table public.data_export_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.data_export_log del
          set infrastructure_id = coalesce(del.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where del.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.data_export_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'data_export_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.data_export_log
                 add constraint data_export_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.data_export_log alter column infrastructure_id set not null';
  end if;

  -- Permission check failures
  if to_regclass('public.permission_check_failures') is not null then
    execute 'alter table public.permission_check_failures add column if not exists infrastructure_id uuid';
    execute format(
      'update public.permission_check_failures pcf
          set infrastructure_id = coalesce(pcf.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where pcf.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.permission_check_failures set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'permission_check_failures_infrastructure_id_fkey'
    ) then
      execute 'alter table public.permission_check_failures
                 add constraint permission_check_failures_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.permission_check_failures alter column infrastructure_id set not null';
  end if;

  -- Business lifecycle log
  if to_regclass('public.business_lifecycle_log') is not null then
    execute 'alter table public.business_lifecycle_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.business_lifecycle_log bll
          set infrastructure_id = coalesce(bll.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where bll.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.business_lifecycle_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'business_lifecycle_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.business_lifecycle_log
                 add constraint business_lifecycle_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.business_lifecycle_log alter column infrastructure_id set not null';
  end if;

  -- Equity transfer log
  if to_regclass('public.equity_transfer_log') is not null then
    execute 'alter table public.equity_transfer_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.equity_transfer_log etl
          set infrastructure_id = coalesce(etl.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where etl.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.equity_transfer_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'equity_transfer_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.equity_transfer_log
                 add constraint equity_transfer_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.equity_transfer_log alter column infrastructure_id set not null';
  end if;

  -- Zone audit logs join via zone->business
  if to_regclass('public.zone_audit_logs') is not null then
    execute 'alter table public.zone_audit_logs add column if not exists infrastructure_id uuid';
    execute format(
      'update public.zone_audit_logs zal
          set infrastructure_id = coalesce(zal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.zones z
         left join public.businesses b on z.business_id = b.id
        where zal.zone_id = z.id',
      v_default_infrastructure
    );
    execute format(
      'update public.zone_audit_logs set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'zone_audit_logs_infrastructure_id_fkey'
    ) then
      execute 'alter table public.zone_audit_logs
                 add constraint zone_audit_logs_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.zone_audit_logs alter column infrastructure_id set not null';
    execute 'create index if not exists idx_zone_audit_logs_infrastructure_id on public.zone_audit_logs(infrastructure_id)';
  end if;

  -- Login history uses actor context only
  if to_regclass('public.login_history') is not null then
    execute 'alter table public.login_history add column if not exists infrastructure_id uuid';
    execute format(
      'update public.login_history lh
          set infrastructure_id = coalesce(lh.infrastructure_id, sub.infrastructure_id, %L::uuid)
         from lateral (
           select b.infrastructure_id
             from public.user_business_roles ubr
             join public.businesses b on b.id = ubr.business_id
            where ubr.user_id = lh.user_id
            order by b.created_at desc
            limit 1
         ) as sub
        where lh.infrastructure_id is distinct from sub.infrastructure_id or lh.infrastructure_id is null',
      v_default_infrastructure
    );
    execute format(
      'update public.login_history set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'login_history_infrastructure_id_fkey'
    ) then
      execute 'alter table public.login_history
                 add constraint login_history_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.login_history alter column infrastructure_id set not null';
    execute 'create index if not exists idx_login_history_infrastructure_id on public.login_history(infrastructure_id)';
  end if;
end $$;

-- Enforce append-only behavior on audit tables.
create or replace function public.prevent_audit_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit tables are append-only and cannot be %% operations', tg_op
    using errcode = '2F000';
end;
$$;

do $$
declare
  r record;
  v_tables text[] := array[
    'system_audit_log',
    'financial_audit_log',
    'cross_scope_access_log',
    'data_export_log',
    'permission_check_failures',
    'business_lifecycle_log',
    'equity_transfer_log',
    'zone_audit_logs',
    'login_history'
  ];
begin
  foreach r in array select unnest(v_tables) as table_name loop
    if to_regclass('public.' || r.table_name) is not null then
      execute format('drop trigger if exists prevent_%1$s_mutations on public.%1$s', r.table_name);
      execute format(
        'create trigger prevent_%1$s_mutations
           before update or delete on public.%1$s
           for each row
           execute function public.prevent_audit_mutations()',
        r.table_name
      );
    end if;
  end loop;
end $$;
