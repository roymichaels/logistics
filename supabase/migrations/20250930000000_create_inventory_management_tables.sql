-- Inventory management tables for per-location tracking
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  central_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  low_stock_threshold integer not null default 10,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_product_unique unique (product_id)
);

create index if not exists inventory_product_idx on inventory(product_id);

create table if not exists driver_inventory (
  id uuid primary key default gen_random_uuid(),
  driver_id text not null,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint driver_inventory_unique unique (driver_id, product_id)
);

create index if not exists driver_inventory_driver_idx on driver_inventory(driver_id);
create index if not exists driver_inventory_product_idx on driver_inventory(product_id);

create table if not exists restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  requested_by text not null,
  requested_quantity integer not null,
  status text not null default 'pending',
  approved_by text,
  approved_quantity integer,
  fulfilled_by text,
  fulfilled_quantity integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists restock_requests_status_idx on restock_requests(status);
create index if not exists restock_requests_product_idx on restock_requests(product_id);

create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  change_type text not null,
  quantity_change integer not null,
  from_location text,
  to_location text,
  reference_id uuid,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists inventory_logs_product_idx on inventory_logs(product_id);
create index if not exists inventory_logs_created_at_idx on inventory_logs(created_at desc);

create table if not exists role_permissions (
  role text primary key,
  can_view_inventory boolean default false,
  can_request_restock boolean default false,
  can_approve_restock boolean default false,
  can_fulfill_restock boolean default false,
  can_transfer_inventory boolean default false,
  can_adjust_inventory boolean default false
);

insert into role_permissions (role, can_view_inventory, can_request_restock, can_approve_restock, can_fulfill_restock, can_transfer_inventory, can_adjust_inventory)
values
  ('manager', true, true, true, true, true, true),
  ('warehouse', true, true, true, true, true, true),
  ('dispatcher', true, true, false, false, true, false),
  ('driver', true, true, false, false, false, false)
on conflict (role) do nothing;

insert into inventory (product_id, central_quantity, reserved_quantity, low_stock_threshold)
select id, stock_quantity, 0, 10
from products
on conflict (product_id) do nothing;

update products p
set stock_quantity = coalesce(i.central_quantity, 0) + coalesce(i.reserved_quantity, 0)
from inventory i
where i.product_id = p.id;
