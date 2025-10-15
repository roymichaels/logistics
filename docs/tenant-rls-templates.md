# Tenant RLS Template Playbook

This guide captures the new helper functions, migration strategy, and tooling for multi-tenant row-level security (RLS).

## Helper Functions

All tenant-aware policies should compose the shared helpers added in `20251015130000_create_tenant_policy_helpers.sql`:

| Function | Purpose |
| --- | --- |
| `current_infrastructure_id()` / `current_business_id()` | Pull active scope from JWT claims or `user_active_contexts`. |
| `current_infrastructure_role()` / `current_business_role()` | Resolve caller roles without hitting `users`. |
| `has_role()` / `has_any_role()` | Shortcut for matching infrastructure *or* business roles. |
| `has_business_role()` | Validate membership (optionally scoped to role keys). |
| `is_infrastructure_admin()` | Infra owner/manager gate with tenant guard rails. |
| `tenant_can_access()` | Base predicate for business scoped rows. |
| `tenant_can_manage_business()` | Mutation predicate (owners + managers + infra admins). |
| `tenant_can_access_infrastructure()` | Infrastructure-level audit/log gating. |

Use these helpers inside policies or database routines instead of bespoke subqueries.

## Policy Generator

`scripts/tenantPolicyTemplates.mjs` provides a reusable generator:

```ts
import { buildTenantPolicyStatements } from '../scripts/tenantPolicyTemplates.mjs';

const { dropStatements, createStatements } = buildTenantPolicyStatements({
  table: 'stock_allocations',
  infrastructureColumn: 'infrastructure_id',
  businessColumn: 'business_id',
  requireManager: true
});
```

Run the CLI to emit SQL for multiple tables:

```bash
node scripts/generate-tenant-policies.mjs '[{"table":"orders","infrastructureColumn":"infrastructure_id","businessColumn":"business_id"}]'
```

## Migration Template

`20251015130500_apply_tenant_policy_templates.sql` demonstrates how to:

1. Detect tables/columns safely via `information_schema`
2. Drop legacy policies via `pg_policies`
3. Recreate standardized `select`, `modify`, `anon`, and `service_role` policies

Extend the `values` array with new tables as modules adopt the shared helpers.

## Audit Tables

`20251015131000_secure_infrastructure_audit_tables.sql` tightens `system_audit_log` and `cross_scope_access_log` around `tenant_can_access_infrastructure()`. Only infra admins for the same tenant retain read/write access, with explicit `service_role` bypass policies for automation.

## Testing

`tests/tenantPolicyTemplates.test.ts` provides unit coverage for the generator. Extend these tests if additional scopes or options are introduced.

