-- Propagates infrastructure scope across business-facing tables.
-- Adds infrastructure_id columns, backfills data, and enforces referential integrity.

set check_function_bodies = off;

do $$
declare
  v_default_infrastructure_id uuid;
  r record;
  v_constraint_name text;
  v_index_name text;
begin
  select id into v_default_infrastructure_id
  from public.infrastructures
  where code = 'default'
  order by created_at asc
  limit 1;

  if v_default_infrastructure_id is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Auto-created to backfill infrastructure scope')
    returning id into v_default_infrastructure_id;
  end if;

  -- Ensure businesses are linked to an infrastructure.
  alter table if exists public.businesses
    add column if not exists infrastructure_id uuid;

  update public.businesses b
  set infrastructure_id = coalesce(b.infrastructure_id, v_default_infrastructure_id)
  where b.infrastructure_id is null;

  alter table if exists public.businesses
    alter column infrastructure_id set not null;

  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_infrastructure_id_fkey'
  ) then
    alter table public.businesses
      add constraint businesses_infrastructure_id_fkey
      foreign key (infrastructure_id) references public.infrastructures(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_infrastructure_name_key'
  ) then
    alter table public.businesses
      add constraint businesses_infrastructure_name_key
      unique (infrastructure_id, name);
  end if;

  create index if not exists idx_businesses_infrastructure
    on public.businesses (infrastructure_id);

  execute format(
    'alter table public.businesses alter column infrastructure_id set default %L::uuid',
    v_default_infrastructure_id
  );

  -- Propagate infrastructure_id to every table that already references business_id.
  for r in
    select c.table_schema, c.table_name, c.is_nullable
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name = 'business_id'
  loop
    if r.table_name = 'businesses' then
      continue;
    end if;

    execute format(
      'alter table %I.%I add column if not exists infrastructure_id uuid',
      r.table_schema,
      r.table_name
    );

    execute format(
      'update %I.%I as t set infrastructure_id = b.infrastructure_id ' ||
      'from public.businesses as b where t.business_id = b.id ' ||
      'and t.infrastructure_id is null and t.business_id is not null',
      r.table_schema,
      r.table_name
    );

    if r.is_nullable = 'NO' then
      execute format(
        'alter table %I.%I alter column infrastructure_id set not null',
        r.table_schema,
        r.table_name
      );
    end if;

    v_constraint_name := format('%s_infrastructure_id_fkey', r.table_name);
    if not exists (
      select 1 from pg_constraint
      where conname = v_constraint_name
    ) then
      execute format(
        'alter table %I.%I add constraint %I foreign key (infrastructure_id) ' ||
        'references public.infrastructures(id)',
        r.table_schema,
        r.table_name,
        v_constraint_name
      );
    end if;

    v_index_name := format('idx_%s_infrastructure_id', r.table_name);
    execute format(
      'create index if not exists %I on %I.%I (infrastructure_id)',
      v_index_name,
      r.table_schema,
      r.table_name
    );
  end loop;
end $$;
