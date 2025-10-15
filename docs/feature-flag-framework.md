# Tenant Feature Flag Framework

## Objectives

The feature flag framework provides a consistent way to toggle application capabilities per infrastructure without duplicating logic across services. It ensures:

- **Predictable defaults** – platform-level flags live in `public.feature_flags` with descriptive metadata and a default activation state.
- **Tenant overrides** – the `public.infrastructure_feature_flags` table records optional per-infrastructure overrides that respect row level security via `tenant_can_access_infrastructure`.
- **Central evaluation helpers** – database functions (`public.is_feature_enabled` and `public.list_feature_flags`) expose effective state calculations for Edge Functions and the frontend service layer.

## Data Model

| Entity | Purpose | Key Columns |
| ------ | ------- | ----------- |
| `feature_flags` | Global feature definitions shared across infrastructures. | `feature_key`, `display_name`, `default_enabled`, `metadata` |
| `infrastructure_feature_flags` | Tenant-specific overrides. | `infrastructure_id`, `feature_key`, `enabled`, `overridden_by`, `notes` |

The migration seeds three baseline flags:

- `advanced_reporting`
- `driver_chat`
- `automated_alerting`

## Access Patterns

- **Read** – authenticated users can view flag metadata. Infrastructure-specific override rows are filtered by RLS to the caller’s tenant.
- **Write** – tenant administrators update overrides through a forthcoming management UI or via the provisioning script. Service-role automation can manage global defaults.
- **Evaluation** – Edge Functions can call `public.is_feature_enabled(<flag_key>)` to gate behavior, or retrieve the full roster via `public.list_feature_flags()`.

## Frontend Integration

A new service helper (`src/services/featureFlags.ts`) exposes:

- `listFeatureFlags()` – fetches effective states for the active infrastructure.
- `isFeatureEnabled()` – convenience wrapper invoking the same RPC used server-side.
- `setFeatureFlagOverride()` – stores an override for the current infrastructure, scoped by tenant guardrails.

The helper relies on the shared `ensureSession`/`callEdgeFunction` utilities and returns strongly typed results defined in `src/services/types.ts`.

## Operational Guidance

- Provisioning automation can pre-seed overrides per infrastructure using the existing `scripts/provision-infrastructure.cjs` workflow.
- Audit queries should include the new `infrastructure_feature_flags` table when scanning for tenant configuration anomalies.
- Tests can mock `public.list_feature_flags` responses to validate UI gating logic without hitting Supabase.

## Next Steps

- Build management UI components that allow infrastructure owners to toggle flags.
- Extend the Edge Function orchestration to short-circuit workflows (e.g., gating driver chat initiation on the `driver_chat` flag).
- Surface flag state in observability dashboards so ops can confirm rollout progress across infrastructures.
