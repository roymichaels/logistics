# Multi-Tenant Architecture Plan (Single Supabase Project)

## Objectives
- Support multiple infrastructure tenants within a single Supabase project while maintaining strict data isolation.
- Simplify authorization flows so the frontend path for any request is predictable and consistent.
- Preserve compatibility with existing business-level RBAC while extending the model with tenant scope.

## Domain & Data Model Adjustments
1. **Tenant Registry**
   - Introduce a top-level `infrastructures` table capturing display metadata, lifecycle status, and default configuration (timezone, currency, etc.).
   - Seed the table with the current infrastructure record and migrate existing businesses to reference it.

2. **Infrastructure Scope Columns**
   - Add an `infrastructure_id` UUID column to every business-scoped table (businesses, warehouses, orders, inventory movements, messages, etc.).
   - Backfill using existing relationships: e.g., `businesses.infrastructure_id` becomes NOT NULL, other tables derive the value through a JOIN on `business_id` in a single update statement.
   - Add a partial unique constraint per tenant where appropriate (e.g., `UNIQUE (infrastructure_id, slug)` on businesses).

3. **User Association**
   - Extend `user_profiles` (or equivalent user metadata table) with a many-to-many relation `user_infrastructures` indicating which infrastructures a user belongs to and their highest role per tenant.
   - Ensure every entry in `user_business_roles` references a business whose `infrastructure_id` the user can access (enforced with a foreign-key constraint or trigger).

4. **Configuration Tables**
   - For global configuration (permissions map, feature flags), add an `infrastructure_id` column when the values may differ per tenant; otherwise mark explicitly as global to avoid ambiguity.

## Auth & JWT Strategy
1. **Claims Layout**
   - Issue JWT custom claims containing `infrastructure_id`, `business_id`, and `role`.
   - Store the active infrastructure/business context in a dedicated table (`user_active_contexts`) and refresh tokens through an auth function whenever the user switches context.

2. **Session Switching Flow**
   - Edge function `switch-context` validates the requested infrastructure + business pair, updates `user_active_contexts`, invalidates permission cache rows, and returns a refreshed session with updated claims.

3. **Service Role Safeguards**
   - Ensure every edge function invoked with service role verifies the caller's tenant scope by checking the passed JWT claims before performing operations.

## RLS Redesign Principles
1. **Table-Level Templates**
   - For tenant-aware tables, create standard policies:
     ```sql
     USING (
       auth.jwt()->>'infrastructure_id' = infrastructure_id::text
       AND (
         auth.jwt()->>'role' = 'infrastructure_owner'
         OR (business_id IS NOT NULL AND auth.jwt()->>'business_id' = business_id::text)
       )
     );
     ```
   - Generate policies via SQL templates to ensure consistency across tables.

2. **System Tables**
   - Restrict infrastructure-wide admin tables (audit logs, billing) to roles with `role = 'infrastructure_owner'` and matching `infrastructure_id`.

3. **Security Definer Helpers**
   - Provide helper functions (e.g., `current_infrastructure_id()`) returning values from claims with fallbacks, minimizing duplication.

4. **Policy Testing**
   - Add automated verification scripts that simulate JWTs for each role/infrastructure combination and assert allowed/denied access paths.

## API & Edge Functions
1. **Tenant-Aware Services**
   - Update service-layer modules so every request includes `infrastructure_id` in the payload or relies on JWT claims, reducing accidental cross-tenant requests.

2. **Shared Edge Functions**
   - Refactor existing functions (allocate stock, approve allocation, resolve permissions) to accept tenant context parameters and validate them before execution.
   - Introduce new functions for tenant provisioning (create infrastructure, seed roles, invite infra admin).

3. **Direct Supabase Queries**
   - Limit direct client queries to read-only operations guarded solely by RLS. For mutations, funnel through edge functions that double-check tenant scope and log actions.

## Migration & Rollout Plan
1. **Preparation**
   - Freeze new schema changes, branch from the latest production schema snapshot, and generate migration scripts for `infrastructures` table and new columns.
   - Create data backfill scripts per table to populate `infrastructure_id`.

2. **Staged Deployment**
   - Apply migrations in a maintenance window: create `infrastructures`, add columns, backfill, enforce NOT NULL/constraints, deploy new RLS policies.
   - Deploy updated edge functions and frontend service layer simultaneously to prevent claim mismatches.

3. **Data Validation**
   - Run verification queries to ensure every record has the correct `infrastructure_id` and no orphaned associations exist.
   - Monitor logs for cross-tenant policy violations post-deploy.

4. **Future Enhancements**
   - Support per-tenant customization by allowing tenants to override permission maps or feature toggles stored in tenant-scoped tables.
   - Investigate using Postgres row-level partitioning by `infrastructure_id` for large datasets to improve performance.

## Operational Considerations
- **Provisioning:** Create automation scripts that, given an infrastructure name, seed roles, default businesses, and invite the initial admin without manual SQL.
- **Monitoring:** Extend auditing to include `infrastructure_id` on every log entry for faster incident triage.
- **Backups:** Ensure backup/restore procedures can target a single tenant by filtering on `infrastructure_id`.

By implementing the above plan, the logistics platform can host multiple infrastructures within the same application instance while keeping data isolation and authorization boundaries tight and maintainable.
