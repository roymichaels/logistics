import { describe, expect, it } from 'vitest';
import {
  HttpError,
  assertTenantScope,
  decodeTenantClaims,
  ensureRoleAllowsInfrastructureTraversal,
  INFRASTRUCTURE_ROLES,
} from '../supabase/functions/_shared/tenantGuard';

function createTestToken(payload: Record<string, unknown>): string {
  const base64Url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url(payload);
  return `${header}.${body}.signature`;
}

describe('tenantGuard utilities', () => {
  it('decodes tenant claims from JWT payload', () => {
    const token = createTestToken({
      sub: 'user-123',
      role: 'infrastructure_owner',
      infrastructure_id: 'infra-1',
      business_id: 'biz-9',
      business_role: 'business_owner',
      context_version: 7,
      context_refreshed_at: '2024-10-15T12:00:00.000Z',
    });

    const claims = decodeTenantClaims(token);

    expect(claims.userId).toBe('user-123');
    expect(claims.role).toBe('infrastructure_owner');
    expect(claims.infrastructureId).toBe('infra-1');
    expect(claims.businessId).toBe('biz-9');
    expect(claims.businessRole).toBe('business_owner');
    expect(claims.contextVersion).toBe(7);
    expect(claims.contextRefreshedAt).toBe('2024-10-15T12:00:00.000Z');
  });

  it('throws HttpError for malformed JWTs', () => {
    expect(() => decodeTenantClaims('invalid-token')).toThrow(HttpError);
  });

  it('validates tenant scope correctly', () => {
    const claims = {
      userId: 'user-123',
      role: 'manager',
      infrastructureId: 'infra-1',
      businessId: 'biz-1',
      businessRole: 'manager',
      contextVersion: 1,
      contextRefreshedAt: null,
    };

    expect(() => assertTenantScope(claims, 'infra-1', 'biz-1')).not.toThrow();
    expect(() => assertTenantScope(claims, null, null)).not.toThrow();
    expect(() => assertTenantScope(claims, 'infra-2', null)).toThrow(HttpError);
    expect(() => assertTenantScope(claims, null, 'biz-2')).toThrow(HttpError);
  });

  it('identifies infrastructure roles that can traverse tenants', () => {
    for (const role of INFRASTRUCTURE_ROLES) {
      expect(ensureRoleAllowsInfrastructureTraversal(role)).toBe(true);
    }

    expect(ensureRoleAllowsInfrastructureTraversal('manager')).toBe(false);
    expect(ensureRoleAllowsInfrastructureTraversal(null)).toBe(false);
  });
});
