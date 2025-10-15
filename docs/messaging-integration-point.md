# Messaging & Notification Integration Point

This blueprint introduces tenant-aware messaging scaffolding without enabling end-user messaging yet. It provides clear extension points for future delivery providers while maintaining infrastructure isolation.

## Channel Model

- **`messaging_channels`** – defines a tenant-scoped channel with a `channel_key`, type (`in_app`, `email`, `sms`, or `webhook`), and JSON configuration for provider credentials.
- **`messaging_channel_members`** – connects users to channels, enabling targeted notifications or future real-time conversations.
- **`messaging_outbox`** – append-only queue where automation writes payloads to deliver. Delivery workers can pick up messages by tenant, maintaining a strict separation via RLS.

The migration also creates a convenience view `messaging_channel_memberships` so the frontend can retrieve membership and channel metadata in one call while the database enforces tenant scope.

## API & Service Contracts

Edge Functions will interact with the messaging scaffold via the following planned endpoints:

| Endpoint | Purpose | Notes |
| -------- | ------- | ----- |
| `POST /functions/v1/messaging/queue` | Append a message to `messaging_outbox`. | Requires `tenantGuard.assertTenantScope` to validate caller. |
| `POST /functions/v1/messaging/channel` | Create or configure channels. | Reserved for infrastructure administrators. |
| `POST /functions/v1/messaging/ack` | Mark queued payloads as processed/failed. | Requires service role. |

## Frontend Service Stubs

A placeholder service (`src/services/messaging.ts`) exposes strongly typed helpers that future UI code can depend on today:

- `listMessagingChannels()`
- `listChannelMembers(channelId)`
- `enqueueMessage(payload)`

Each helper currently throws a descriptive error to avoid silent failures until the backend endpoints are fully implemented.

## Tenant Isolation

All messaging tables include `infrastructure_id` and rely on the established helper predicates:

- `messaging_channels` and `messaging_channel_members` use `tenant_can_access_infrastructure` to gate access.
- `messaging_outbox` includes both `infrastructure_id` and optional `business_id` filters, leveraging `tenant_can_access` for dual scope enforcement.

These guardrails allow per-tenant delivery workers to run safely without cross-tenant data leakage.

## Next Steps

1. Implement the queue Edge Function to read/write `messaging_outbox` with audit logging.
2. Connect delivery workers (or external providers) that poll the queue and invoke actual transport APIs.
3. Build UI components for infrastructure administrators to configure channels and for business operators to opt into alerts.
