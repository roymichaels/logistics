-- Prototype script to evaluate infrastructure-level partitioning for high-volume tables.
\echo 'Starting partitioning prototype...'

-- Shadow tables for evaluation.
drop table if exists public.orders_partitioned cascade;
create table public.orders_partitioned
  (like public.orders including all)
  partition by list (infrastructure_id);

select 'orders_partitioned created' as status;

drop table if exists public.inventory_movements_partitioned cascade;
create table public.inventory_movements_partitioned
  (like public.inventory_movements including all)
  partition by list (infrastructure_id);

select 'inventory_movements_partitioned created' as status;

do $$
declare
  rec record;
  partition_name text;
begin
  for rec in
    select id
    from public.infrastructures
    order by created_at
    limit 5
  loop
    partition_name := format('orders_part_%s', replace(rec.id::text, '-', '_'));
    execute format(
      'create table if not exists public.%I partition of public.orders_partitioned for values in (%L);',
      partition_name,
      rec.id
    );

    partition_name := format('inventory_movements_part_%s', replace(rec.id::text, '-', '_'));
    execute format(
      'create table if not exists public.%I partition of public.inventory_movements_partitioned for values in (%L);',
      partition_name,
      rec.id
    );
  end loop;
end $$;

select 'Partitions created for sample infrastructures' as status;

-- Populate partitions with a sample workload for explain analysis.
insert into public.orders_partitioned
select *
from public.orders
where infrastructure_id in (
  select id from public.infrastructures order by created_at limit 5
);

insert into public.inventory_movements_partitioned
select *
from public.inventory_movements
where infrastructure_id in (
  select id from public.infrastructures order by created_at limit 5
);

select 'Sample data copied' as status;

-- Compare plans for a representative query.
\echo 'Original orders query plan:'
explain analyze
select count(*)
from public.orders
where infrastructure_id = (
  select id from public.infrastructures order by created_at limit 1
);

\echo 'Partitioned orders query plan:'
explain analyze
select count(*)
from public.orders_partitioned
where infrastructure_id = (
  select id from public.infrastructures order by created_at limit 1
);

\echo 'Prototype complete.'
