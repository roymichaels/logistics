-- Establishes tenant-aware messaging scaffolding for future notification modules.
set check_function_bodies = off;

create table if not exists public.messaging_channels (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  channel_key text not null,
  channel_type text not null default 'in_app' check (channel_type in ('in_app', 'email', 'sms', 'webhook')),
  display_name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (infrastructure_id, channel_key)
);

comment on table public.messaging_channels is 'Tenant-scoped message channels used by future notification integrations.';
comment on column public.messaging_channels.channel_key is 'Stable identifier used by frontend and automation hooks.';
comment on column public.messaging_channels.channel_type is 'Specifies the delivery medium for the channel.';

create index if not exists idx_messaging_channels_infra
  on public.messaging_channels(infrastructure_id);

create index if not exists idx_messaging_channels_type
  on public.messaging_channels(channel_type) where is_active;

-- Maintain updated_at timestamp.
drop trigger if exists trg_messaging_channels_updated_at on public.messaging_channels;
create trigger trg_messaging_channels_updated_at
  before update on public.messaging_channels
  for each row
  execute function public.set_updated_at();

alter table public.messaging_channels enable row level security;

create policy if not exists "Tenant channels select"
  on public.messaging_channels
  for select
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant channels modify"
  on public.messaging_channels
  for all
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id))
  with check (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant channels anon blocked"
  on public.messaging_channels
  for select
  to anon
  using (false);

create policy if not exists "Tenant channels service bypass"
  on public.messaging_channels
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.messaging_channel_members (
  channel_id uuid not null references public.messaging_channels(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'participant',
  joined_at timestamptz not null default now(),
  last_acknowledged_at timestamptz,
  primary key (channel_id, user_id)
);

comment on table public.messaging_channel_members is 'Links users to messaging channels for notification routing.';
comment on column public.messaging_channel_members.role is 'Role within the channel (participant, moderator, observer, etc.).';

alter table public.messaging_channel_members enable row level security;

create policy if not exists "Tenant channel member select"
  on public.messaging_channel_members
  for select
  to authenticated
  using (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  );

create policy if not exists "Tenant channel member modify"
  on public.messaging_channel_members
  for all
  to authenticated
  using (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  )
  with check (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  );

create policy if not exists "Tenant channel member anon blocked"
  on public.messaging_channel_members
  for select
  to anon
  using (false);

create policy if not exists "Tenant channel member service bypass"
  on public.messaging_channel_members
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.messaging_outbox (
  id bigserial primary key,
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  channel_id uuid references public.messaging_channels(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  subject text,
  body jsonb not null,
  delivery_state text not null default 'pending' check (delivery_state in ('pending', 'processing', 'sent', 'failed')),
  retry_count integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.messaging_outbox is 'Queue of tenant-scoped notification payloads awaiting delivery.';

create index if not exists idx_messaging_outbox_infra_state
  on public.messaging_outbox(infrastructure_id, delivery_state, scheduled_at);

create index if not exists idx_messaging_outbox_channel
  on public.messaging_outbox(channel_id)
  where channel_id is not null;

-- Maintain updated_at timestamp.
drop trigger if exists trg_messaging_outbox_updated_at on public.messaging_outbox;
create trigger trg_messaging_outbox_updated_at
  before update on public.messaging_outbox
  for each row
  execute function public.set_updated_at();

alter table public.messaging_outbox enable row level security;

create policy if not exists "Tenant outbox select"
  on public.messaging_outbox
  for select
  to authenticated
  using (public.tenant_can_access(infrastructure_id, business_id));

create policy if not exists "Tenant outbox modify"
  on public.messaging_outbox
  for all
  to authenticated
  using (public.tenant_can_access(infrastructure_id, business_id))
  with check (public.tenant_can_access(infrastructure_id, business_id));

create policy if not exists "Tenant outbox anon blocked"
  on public.messaging_outbox
  for select
  to anon
  using (false);

create policy if not exists "Tenant outbox service bypass"
  on public.messaging_outbox
  for all
  to service_role
  using (true)
  with check (true);

-- Provide helper view summarizing channel membership for UI consumption.
create or replace view public.messaging_channel_memberships as
select
  mcm.channel_id,
  mc.infrastructure_id,
  mc.channel_key,
  mc.channel_type,
  mc.display_name,
  mc.is_active,
  mcm.user_id,
  mcm.role,
  mcm.joined_at,
  mcm.last_acknowledged_at
from public.messaging_channel_members mcm
join public.messaging_channels mc on mc.id = mcm.channel_id;

comment on view public.messaging_channel_memberships is 'Denormalized channel membership view respecting underlying RLS rules.';
