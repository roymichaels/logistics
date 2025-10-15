import { describe, expect, it } from 'vitest';

interface MembershipMap {
  [businessId: string]: string[];
}

interface SimulationContext {
  infrastructureId: string | null;
  infrastructureRole: string | null;
  memberships: MembershipMap;
}

const INFRA_ADMIN_ROLES = new Set(['infrastructure_owner', 'infrastructure_manager']);
const BUSINESS_MANAGEMENT_ROLES = new Set(['business_owner', 'manager']);

function tenantCanAccess(
  rowInfrastructureId: string | null,
  rowBusinessId: string | null,
  context: SimulationContext
): boolean {
  if (!rowInfrastructureId || context.infrastructureId !== rowInfrastructureId) {
    return false;
  }

  if (!rowBusinessId) {
    return true;
  }

  if (INFRA_ADMIN_ROLES.has(context.infrastructureRole ?? '')) {
    return true;
  }

  const roles = context.memberships[rowBusinessId] ?? [];
  return roles.length > 0;
}

function tenantCanManageBusiness(
  rowInfrastructureId: string | null,
  rowBusinessId: string | null,
  context: SimulationContext
): boolean {
  if (!tenantCanAccess(rowInfrastructureId, rowBusinessId, context)) {
    return false;
  }

  if (INFRA_ADMIN_ROLES.has(context.infrastructureRole ?? '')) {
    return true;
  }

  if (!rowBusinessId) {
    return false;
  }

  const roles = context.memberships[rowBusinessId] ?? [];
  return roles.some(role => BUSINESS_MANAGEMENT_ROLES.has(role));
}

function tenantCanAccessInfrastructure(
  rowInfrastructureId: string | null,
  context: SimulationContext
): boolean {
  if (!rowInfrastructureId || context.infrastructureId !== rowInfrastructureId) {
    return false;
  }
  return INFRA_ADMIN_ROLES.has(context.infrastructureRole ?? '');
}

describe('tenant RLS simulation harness', () => {
  const INFRA_A = 'infra-a';
  const INFRA_B = 'infra-b';
  const BUSINESS_1 = 'biz-1';
  const BUSINESS_2 = 'biz-2';

  it('allows infrastructure admins to traverse all businesses in their infrastructure', () => {
    const context: SimulationContext = {
      infrastructureId: INFRA_A,
      infrastructureRole: 'infrastructure_owner',
      memberships: {},
    };

    expect(tenantCanAccess(INFRA_A, BUSINESS_1, context)).toBe(true);
    expect(tenantCanAccess(INFRA_A, BUSINESS_2, context)).toBe(true);
    expect(tenantCanManageBusiness(INFRA_A, BUSINESS_1, context)).toBe(true);
    expect(tenantCanAccessInfrastructure(INFRA_A, context)).toBe(true);
    expect(tenantCanAccess(INFRA_B, BUSINESS_1, context)).toBe(false);
  });

  it('restricts business managers to assigned businesses', () => {
    const context: SimulationContext = {
      infrastructureId: INFRA_A,
      infrastructureRole: 'manager',
      memberships: {
        [BUSINESS_1]: ['manager'],
      },
    };

    expect(tenantCanAccess(INFRA_A, BUSINESS_1, context)).toBe(true);
    expect(tenantCanManageBusiness(INFRA_A, BUSINESS_1, context)).toBe(true);
    expect(tenantCanAccess(INFRA_A, BUSINESS_2, context)).toBe(false);
    expect(tenantCanManageBusiness(INFRA_A, BUSINESS_2, context)).toBe(false);
    expect(tenantCanAccessInfrastructure(INFRA_A, context)).toBe(false);
  });

  it('prevents cross-infrastructure leakage even for administrators', () => {
    const context: SimulationContext = {
      infrastructureId: INFRA_B,
      infrastructureRole: 'infrastructure_manager',
      memberships: {
        [BUSINESS_1]: ['business_owner'],
      },
    };

    expect(tenantCanAccess(INFRA_A, BUSINESS_1, context)).toBe(false);
    expect(tenantCanManageBusiness(INFRA_A, BUSINESS_1, context)).toBe(false);
    expect(tenantCanAccessInfrastructure(INFRA_A, context)).toBe(false);
  });

  it('allows drivers to view assigned business rows but not manage them', () => {
    const context: SimulationContext = {
      infrastructureId: INFRA_A,
      infrastructureRole: 'driver',
      memberships: {
        [BUSINESS_1]: ['driver'],
      },
    };

    expect(tenantCanAccess(INFRA_A, BUSINESS_1, context)).toBe(true);
    expect(tenantCanManageBusiness(INFRA_A, BUSINESS_1, context)).toBe(false);
  });

  it('denies access when infrastructure scope is missing', () => {
    const context: SimulationContext = {
      infrastructureId: null,
      infrastructureRole: 'infrastructure_owner',
      memberships: {},
    };

    expect(tenantCanAccess(INFRA_A, BUSINESS_1, context)).toBe(false);
    expect(tenantCanAccessInfrastructure(INFRA_A, context)).toBe(false);
  });
});
