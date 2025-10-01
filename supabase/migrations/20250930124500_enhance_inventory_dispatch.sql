-- Ensure core inventory and dispatch tables exist with required columns

-- Inventory table adjustments
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid not null references inventory_locations(id) on delete cascade,
  on_hand_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  damaged_quantity integer not null default 0,
  low_stock_threshold integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_product_location_unique unique (product_id, location_id)
);

create index if not exists inventory_product_idx on inventory(product_id);
create index if not exists inventory_location_idx on inventory(location_id);

alter table if exists inventory
  add column if not exists on_hand_quantity integer not null default 0,
  add column if not exists reserved_quantity integer not null default 0,
  add column if not exists damaged_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 0,
  add column if not exists location_id uuid references inventory_locations(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists inventory_product_location_unique on inventory(product_id, location_id);

-- Driver inventory
create table if not exists driver_inventory (
  id uuid primary key default gen_random_uuid(),
  driver_id text not null,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0,
  location_id uuid references inventory_locations(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint driver_inventory_unique unique (driver_id, product_id)
);

create index if not exists driver_inventory_driver_idx on driver_inventory(driver_id);
create index if not exists driver_inventory_product_idx on driver_inventory(product_id);

alter table if exists driver_inventory
  add column if not exists location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Restock requests
create table if not exists restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  requested_by text not null,
  requested_quantity integer not null,
  status text not null default 'pending',
  from_location_id uuid references inventory_locations(id) on delete set null,
  to_location_id uuid references inventory_locations(id) on delete set null,
  approved_by text,
  approved_quantity integer,
  fulfilled_by text,
  fulfilled_quantity integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists restock_requests
  add column if not exists from_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists approved_quantity integer,
  add column if not exists fulfilled_quantity integer,
  add column if not exists approved_by text,
  add column if not exists fulfilled_by text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table if exists restock_requests
  add constraint restock_requests_status_check
  check (status in ('pending', 'approved', 'in_transit', 'fulfilled', 'rejected'));

create index if not exists restock_requests_product_idx on restock_requests(product_id);
create index if not exists restock_requests_status_idx on restock_requests(status);
create index if not exists restock_requests_to_location_idx on restock_requests(to_location_id);
create index if not exists restock_requests_from_location_idx on restock_requests(from_location_id);

-- Inventory logs
create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  change_type text not null,
  quantity_change integer not null,
  from_location_id uuid references inventory_locations(id) on delete set null,
  to_location_id uuid references inventory_locations(id) on delete set null,
  reference_id uuid,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

alter table if exists inventory_logs
  add column if not exists from_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references inventory_locations(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add constraint inventory_logs_change_type_check
    check (change_type in ('restock', 'transfer', 'adjustment', 'reservation', 'release', 'sale'));

create index if not exists inventory_logs_product_idx on inventory_logs(product_id);
create index if not exists inventory_logs_created_at_idx on inventory_logs(created_at desc);
create index if not exists inventory_logs_from_location_idx on inventory_logs(from_location_id);
create index if not exists inventory_logs_to_location_idx on inventory_logs(to_location_id);

-- Zones catalog
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  description text,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists zones_active_idx on zones(active) where active = true;

-- Driver zone assignments
create table if not exists driver_zones (
  id uuid primary key default gen_random_uuid(),
  driver_id text not null,
  zone_id uuid not null references zones(id) on delete cascade,
  active boolean not null default true,
  assigned_at timestamptz not null default timezone('utc', now()),
  unassigned_at timestamptz,
  assigned_by text,
  constraint driver_zone_unique unique (driver_id, zone_id)
);

create index if not exists driver_zones_driver_idx on driver_zones(driver_id);
create index if not exists driver_zones_zone_idx on driver_zones(zone_id);
create index if not exists driver_zones_active_idx on driver_zones(active);

-- Driver status table
create table if not exists driver_status (
  driver_id text primary key,
  status text not null default 'available',
  is_online boolean not null default false,
  current_zone_id uuid references zones(id) on delete set null,
  last_updated timestamptz not null default timezone('utc', now()),
  note text
);

create index if not exists driver_status_zone_idx on driver_status(current_zone_id);
create index if not exists driver_status_online_idx on driver_status(is_online);

-- Driver movement logs
create table if not exists driver_movements (
  id uuid primary key default gen_random_uuid(),
  driver_id text not null,
  zone_id uuid references zones(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  quantity_change integer,
  action text not null,
  details text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists driver_movements_driver_idx on driver_movements(driver_id);
create index if not exists driver_movements_zone_idx on driver_movements(zone_id);
create index if not exists driver_movements_action_idx on driver_movements(action);

-- Sales logs
create table if not exists sales_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid not null references inventory_locations(id) on delete cascade,
  quantity integer not null,
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

alter table if exists sales_logs
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists recorded_by text not null,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

-- Permissions alignment
alter table if exists role_permissions
  add column if not exists can_view_movements boolean default false,
  add column if not exists can_manage_locations boolean default false,
  add column if not exists can_view_sales boolean default false;
