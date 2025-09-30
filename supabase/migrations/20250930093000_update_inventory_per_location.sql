-- Align inventory schema with per-location tracking and workflow helpers

-- Inventory locations catalog
create table if not exists inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text not null check (type in ('central', 'warehouse', 'hub', 'vehicle', 'storefront')),
  description text,
  address_line1 text,
  address_line2 text,
  city text,
  contact_phone text,
  manager_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_locations_type_idx on inventory_locations(type);

insert into inventory_locations (code, name, type)
values ('CENTRAL', 'מרכז הפצה ראשי', 'central')
on conflict (code) do update
set name = excluded.name,
    type = excluded.type,
    updated_at = timezone('utc', now());

-- Per-location inventory balances
alter table if exists inventory
  drop constraint if exists inventory_product_unique;

alter table if exists inventory
  add column if not exists location_id uuid references inventory_locations(id) on delete cascade,
  add column if not exists on_hand_quantity integer default 0,
  add column if not exists damaged_quantity integer default 0,
  alter column reserved_quantity set default 0,
  alter column low_stock_threshold set default 0,
  alter column updated_at set default timezone('utc', now());

update inventory
set on_hand_quantity = coalesce(on_hand_quantity, central_quantity, 0),
    damaged_quantity = coalesce(damaged_quantity, 0)
where true;

update inventory
set location_id = (
  select id from inventory_locations where code = 'CENTRAL' limit 1
)
where location_id is null;

alter table if exists inventory
  alter column location_id set not null,
  alter column on_hand_quantity set not null,
  alter column reserved_quantity set not null,
  alter column damaged_quantity set not null;

alter table if exists inventory
  drop column if exists central_quantity;

create unique index if not exists inventory_product_location_unique
  on inventory(product_id, location_id);
create index if not exists inventory_location_idx on inventory(location_id);

-- Driver inventory aligns to location catalog (optional vehicle rows)
alter table if exists driver_inventory
  add column if not exists location_id uuid references inventory_locations(id) on delete set null,
  alter column quantity set default 0,
  alter column updated_at set default timezone('utc', now());

-- Restock requests capture origination/destination locations
alter table if exists restock_requests
  add column if not exists from_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists fulfilled_at timestamptz;

alter table if exists restock_requests
  alter column status set default 'pending';

update restock_requests
set to_location_id = coalesce(
    to_location_id,
    (select id from inventory_locations where code = 'CENTRAL' limit 1)
  )
where to_location_id is null;

alter table if exists restock_requests
  add constraint restock_requests_status_check
  check (status in ('pending', 'approved', 'in_transit', 'fulfilled', 'rejected'));

create index if not exists restock_requests_to_location_idx on restock_requests(to_location_id);
create index if not exists restock_requests_from_location_idx on restock_requests(from_location_id);

-- Inventory logs capture locations explicitly
alter table if exists inventory_logs
  add column if not exists from_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references inventory_locations(id) on delete set null;

alter table if exists inventory_logs
  add constraint inventory_logs_change_type_check
  check (change_type in ('restock', 'transfer', 'adjustment', 'reservation', 'release', 'sale'));

alter table if exists inventory_logs
  drop column if exists from_location;

alter table if exists inventory_logs
  drop column if exists to_location;

create index if not exists inventory_logs_from_location_idx on inventory_logs(from_location_id);
create index if not exists inventory_logs_to_location_idx on inventory_logs(to_location_id);

-- Sales logging per location
create table if not exists sales_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid not null references inventory_locations(id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  total_amount numeric(12,2) not null default 0,
  reference_id uuid,
  recorded_by text not null,
  sold_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_logs_product_idx on sales_logs(product_id);
create index if not exists sales_logs_location_idx on sales_logs(location_id);
create index if not exists sales_logs_sold_at_idx on sales_logs(sold_at desc);

-- Role permission extensions
alter table if exists role_permissions
  add column if not exists can_view_movements boolean default false,
  add column if not exists can_manage_locations boolean default false,
  add column if not exists can_view_sales boolean default false;

update role_permissions
set can_view_movements = case when role in ('manager', 'warehouse', 'dispatcher') then true else can_view_movements end,
    can_manage_locations = case when role in ('manager') then true else can_manage_locations end,
    can_view_sales = case when role in ('manager', 'sales') then true else can_view_sales end;

-- Low stock alerts surface per-location shortages
create or replace view inventory_low_stock_alerts as
select
  i.product_id,
  p.name as product_name,
  i.location_id,
  l.name as location_name,
  i.on_hand_quantity,
  i.reserved_quantity,
  i.low_stock_threshold,
  greatest(i.updated_at, timezone('utc', now())) as triggered_at
from inventory i
join products p on p.id = i.product_id
join inventory_locations l on l.id = i.location_id
where i.on_hand_quantity <= greatest(0, i.low_stock_threshold);

create index if not exists inventory_low_stock_alerts_location_idx on inventory(location_id) where on_hand_quantity <= low_stock_threshold;

-- Helper function: inventory transfer transactional logic
create or replace function perform_inventory_transfer(
  p_product_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity integer,
  p_actor text,
  p_reference_id uuid default null,
  p_notes text default null
) returns void
language plpgsql
as $$
declare
  v_from_record inventory%rowtype;
  v_to_record inventory%rowtype;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Transfer quantity must be positive';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'Source and destination locations must differ';
  end if;

  update inventory
  set on_hand_quantity = on_hand_quantity - p_quantity,
      updated_at = timezone('utc', now())
  where product_id = p_product_id
    and location_id = p_from_location_id
  returning * into v_from_record;

  if not found then
    raise exception 'Source inventory balance not found';
  end if;

  if v_from_record.on_hand_quantity < 0 then
    raise exception 'Insufficient quantity at source location';
  end if;

  insert into inventory (product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at)
  values (p_product_id, p_to_location_id, p_quantity, 0, 0, v_from_record.low_stock_threshold, timezone('utc', now()))
  on conflict (product_id, location_id) do update
    set on_hand_quantity = inventory.on_hand_quantity + excluded.on_hand_quantity,
        updated_at = excluded.updated_at
  returning * into v_to_record;

  insert into inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) values (
    p_product_id,
    'transfer',
    -1 * p_quantity,
    p_from_location_id,
    p_to_location_id,
    p_reference_id,
    p_actor,
    timezone('utc', now()),
    jsonb_build_object('notes', p_notes, 'direction', 'outbound')
  );

  insert into inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) values (
    p_product_id,
    'transfer',
    p_quantity,
    p_from_location_id,
    p_to_location_id,
    p_reference_id,
    p_actor,
    timezone('utc', now()),
    jsonb_build_object('notes', p_notes, 'direction', 'inbound')
  );
end;
$$;

-- Helper: approve restock requests atomically
create or replace function approve_restock_request(
  p_request_id uuid,
  p_actor text,
  p_from_location_id uuid,
  p_approved_quantity integer,
  p_notes text default null
) returns restock_requests
language plpgsql
as $$
declare
  v_request restock_requests%rowtype;
begin
  if p_approved_quantity is null or p_approved_quantity <= 0 then
    raise exception 'Approved quantity must be positive';
  end if;

  select * into v_request
  from restock_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Restock request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending requests can be approved';
  end if;

  update restock_requests
  set status = 'approved',
      approved_by = p_actor,
      approved_quantity = p_approved_quantity,
      from_location_id = p_from_location_id,
      approved_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      notes = case
        when p_notes is not null and p_notes <> '' then coalesce(v_request.notes, '') || '\n' || p_notes
        else v_request.notes
      end
  where id = p_request_id
  returning * into v_request;

  insert into inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) values (
    v_request.product_id,
    'reservation',
    p_approved_quantity,
    p_from_location_id,
    v_request.to_location_id,
    v_request.id,
    p_actor,
    timezone('utc', now()),
    jsonb_build_object('event', 'restock_approved', 'notes', p_notes)
  );

  return v_request;
end;
$$;

-- Helper: fulfill restock requests atomically (performs transfer)
create or replace function fulfill_restock_request(
  p_request_id uuid,
  p_actor text,
  p_fulfilled_quantity integer,
  p_reference_id uuid default null,
  p_notes text default null
) returns restock_requests
language plpgsql
as $$
declare
  v_request restock_requests%rowtype;
begin
  if p_fulfilled_quantity is null or p_fulfilled_quantity <= 0 then
    raise exception 'Fulfilled quantity must be positive';
  end if;

  select * into v_request
  from restock_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Restock request not found';
  end if;

  if v_request.status not in ('approved', 'in_transit') then
    raise exception 'Restock request must be approved before fulfillment';
  end if;

  if v_request.from_location_id is null then
    raise exception 'Restock request is missing source location';
  end if;

  perform perform_inventory_transfer(
    v_request.product_id,
    v_request.from_location_id,
    v_request.to_location_id,
    p_fulfilled_quantity,
    p_actor,
    coalesce(p_reference_id, v_request.id),
    p_notes
  );

  update restock_requests
  set status = 'fulfilled',
      fulfilled_by = p_actor,
      fulfilled_quantity = p_fulfilled_quantity,
      fulfilled_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      notes = case
        when p_notes is not null and p_notes <> '' then coalesce(v_request.notes, '') || '\n' || p_notes
        else v_request.notes
      end
  where id = p_request_id;

  select * into v_request from restock_requests where id = p_request_id;
  return v_request;
end;
$$;

-- Helper: reject restock requests with audit logging
create or replace function reject_restock_request(
  p_request_id uuid,
  p_actor text,
  p_notes text default null
) returns restock_requests
language plpgsql
as $$
declare
  v_request restock_requests%rowtype;
begin
  select * into v_request
  from restock_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Restock request not found';
  end if;

  if v_request.status in ('fulfilled', 'rejected') then
    raise exception 'Request already resolved';
  end if;

  update restock_requests
  set status = 'rejected',
      approved_by = p_actor,
      approved_quantity = 0,
      updated_at = timezone('utc', now()),
      notes = case
        when p_notes is not null and p_notes <> '' then coalesce(v_request.notes, '') || '\n' || p_notes
        else v_request.notes
      end
  where id = p_request_id
  returning * into v_request;

  insert into inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) values (
    v_request.product_id,
    'release',
    coalesce(v_request.approved_quantity, v_request.requested_quantity),
    v_request.from_location_id,
    v_request.to_location_id,
    v_request.id,
    p_actor,
    timezone('utc', now()),
    jsonb_build_object('event', 'restock_rejected', 'notes', p_notes)
  );

  return v_request;
end;
$$;
