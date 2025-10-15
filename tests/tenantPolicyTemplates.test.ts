import { describe, expect, it } from 'vitest';
import { buildTenantPolicyStatements, generateTenantPolicySql } from '../scripts/tenantPolicyTemplates.mjs';

describe('tenant policy template generator', () => {
  it('builds business-scoped policies with management checks', () => {
    const result = buildTenantPolicyStatements({
      table: 'user_business_roles',
      infrastructureColumn: 'infrastructure_id',
      businessColumn: 'business_id',
      requireManager: true
    });

    expect(result.scope).toBe('business');
    expect(result.usingCondition).toBe('public.tenant_can_access("infrastructure_id", "business_id")');
    expect(result.checkCondition).toBe('public.tenant_can_manage_business("infrastructure_id", "business_id")');
    expect(result.createStatements[0]).toContain('create policy "Tenant access (user_business_roles) select"');
    expect(result.createStatements[1]).toContain('with check (public.tenant_can_manage_business("infrastructure_id", "business_id"))');
  });

  it('defaults to infrastructure scope when no business column is provided', () => {
    const result = buildTenantPolicyStatements({
      table: 'system_audit_log',
      infrastructureColumn: 'infrastructure_id'
    });

    expect(result.scope).toBe('infrastructure');
    expect(result.usingCondition).toBe('public.tenant_can_access_infrastructure("infrastructure_id")');
    expect(result.checkCondition).toBe('public.tenant_can_access_infrastructure("infrastructure_id")');
    expect(result.createStatements[0]).toContain('public.system_audit_log');
  });

  it('generates multi-table SQL output', () => {
    const sql = generateTenantPolicySql([
      {
        table: 'businesses',
        infrastructureColumn: 'infrastructure_id',
        businessColumn: 'id'
      },
      {
        table: 'warehouses',
        infrastructureColumn: 'infrastructure_id',
        businessColumn: 'business_id',
        requireManager: false
      }
    ]);

    expect(sql).toContain('drop policy if exists "Tenant access (businesses) select"');
    expect(sql).toContain('create policy "Tenant access (warehouses) select" on public.warehouses');
    expect(sql.split('\n').length).toBeGreaterThan(5);
  });
});
