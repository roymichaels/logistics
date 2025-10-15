# Service-Role Guardrails Adoption Checklist

The new `switch-context` flow introduces a shared tenant guard (`supabase/functions/_shared/tenantGuard.ts`) that all service-role edge functions should rely on before executing privileged operations.

## Checklist

1. **Import Guard Utilities**
   - `requireAccessToken` to enforce Bearer token presence.
   - `decodeTenantClaims` to read `infrastructure_id`, `business_id`, and `context_version` from JWTs.
   - `assertTenantScope` to compare requested tenant scopes with the caller’s claims.
   - `ensureRoleAllowsInfrastructureTraversal` for infrastructure-level overrides.

2. **Validate Requests Early**
   - Reject requests without tokens with HTTP 401.
   - Reject tenant mismatches with HTTP 403 to prevent cross-tenant access.

3. **Audit Logging**
   - Log context-aware actions to `system_audit_log` with `infrastructure_id` and `business_id`.

4. **Cache Invalidation**
   - Clear `user_permissions_cache` when context or role changes are detected.

5. **Token Refresh Strategy**
   - Accept a `refresh_token` payload when operations mutate context so the function can return an updated session.

6. **Testing**
   - Extend Vitest coverage using `tests/tenantGuard.test.ts` for any new helper logic.

Apply this checklist to existing functions (`allocate-stock`, `approve-allocation`, `deliver-order`, `resolve-permissions`, etc.) as they are refactored to the new tenant-aware model.
