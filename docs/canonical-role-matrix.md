# Canonical Role Hierarchy & Permission Matrix

This document captures the authoritative mapping between platform roles and their permissions after the Phase 3 RBAC refactor.
The database seeds (`20251015120000_seed_canonical_role_matrix.sql`) populate the `canonical_role_permissions` view which is
consumed by the `resolve-permissions` Edge Function and frontend service layer.

## Base Roles

| Role Key              | Scope Level     | Financial Access | Cross-Business | Highlights |
|-----------------------|-----------------|------------------|----------------|------------|
| `infrastructure_owner` | Infrastructure | ✅ Full financial | ✅ All tenants  | Full platform control, system configuration, analytics exports |
| `business_owner`      | Business        | ✅ Business-wide  | ❌             | Manage business settings, financials, staffing, allocations |
| `manager`             | Business        | ❌               | ❌             | Operate day-to-day workflows: orders, inventory, staffing |
| `driver`              | Business        | ❌               | ❌             | Update assigned orders, view own inventory, messaging |

> Additional infrastructure roles (`infrastructure_manager`, `infrastructure_dispatcher`, etc.) retain their existing
> definitions. The canonical mapping can be extended in the same fashion as new permissions are introduced.

## Permission Bundles

### Business Owner
- Orders: create, update, assign drivers, manage status, view all business orders
- Inventory: create/update/delete, transfer, restock lifecycle approvals
- Users: invite, approve, assign roles, manage ownership percentages
- Financials: view revenue/cost/profit, manage distributions, export reports
- Business controls: manage settings, ownership, context switching
- Collaboration: full messaging, groups, channels access
- Analytics: view/export business dashboards, zone management

### Manager
- Orders: create/update/assign within business context
- Inventory: end-to-end restock approvals and transfers
- Users: view business teammates, assign roles within business scope
- Business controls: manage settings, context switching
- Collaboration: messaging, groups, channels
- Analytics: operational dashboards for business scope

### Driver
- Orders: view assigned deliveries, update statuses
- Inventory: view own stock, request restock
- Collaboration: messaging, groups, channels (read/send)

## Data Access Utilities

- `canonical_role_permissions` view aggregates `roles` + `role_permissions` into a JSON array per role.
- `business_memberships` view resolves active memberships with enriched user/business metadata.
- Both views are granted to the `authenticated` role for frontend consumption via Supabase SDK.

## Edge Function Contract

`supabase/functions/resolve-permissions` now:
1. Decodes tenant claims (infrastructure + business scope) from JWT tokens.
2. Resolves the caller's base role via infrastructure role claim or `business_memberships` lookup.
3. Returns the canonical permission bundle with no cache dependency (`from_cache` always `false`).

## Extensibility Notes

- To introduce a new role, seed it in `roles`, map permissions via `canonical_role_permissions`, and document it here.
- Custom roles remain supported via `custom_roles` but resolve to their base role for canonical permissions until extended.
- Client libraries use `src/lib/roleMappings.ts` to translate between legacy labels (`owner`) and canonical keys (`business_owner`).
