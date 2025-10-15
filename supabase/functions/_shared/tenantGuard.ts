export const INFRASTRUCTURE_ROLES = new Set([
  'infrastructure_owner',
  'infrastructure_manager',
  'infrastructure_dispatcher',
  'infrastructure_driver',
  'infrastructure_warehouse',
  'infrastructure_accountant',
]);

export interface TenantClaims {
  userId: string | null;
  role: string | null;
  infrastructureId: string | null;
  businessId: string | null;
  businessRole: string | null;
  contextVersion: number | null;
  contextRefreshedAt: string | null;
}

export class HttpError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function base64UrlDecode(input: string): string {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  if (pad) {
    normalized += '='.repeat(4 - pad);
  }

  if (typeof atob === 'function') {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(normalized, 'base64').toString('utf-8');
  }

  throw new Error('No base64 decoder available in current runtime');
}

export function decodeTenantClaims(token: string): TenantClaims {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new HttpError(401, 'Invalid JWT structure');
  }

  try {
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    return {
      userId: payload.sub ?? payload.user_id ?? null,
      role: payload.role ?? payload.app_role ?? payload.user_role ?? null,
      infrastructureId: payload.infrastructure_id ?? payload.app_metadata?.infrastructure_id ?? null,
      businessId: payload.business_id ?? payload.app_metadata?.business_id ?? null,
      businessRole: payload.business_role ?? payload.app_metadata?.business_role ?? null,
      contextVersion: typeof payload.context_version === 'number'
        ? payload.context_version
        : payload.app_metadata?.context_version ?? null,
      contextRefreshedAt: payload.context_refreshed_at ?? payload.app_metadata?.context_refreshed_at ?? null,
    };
  } catch (error) {
    throw new HttpError(401, 'Failed to parse JWT payload', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function requireAccessToken(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authorization header with Bearer token is required');
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new HttpError(401, 'Empty Bearer token provided');
  }
  return token;
}

export function assertTenantScope(
  claims: TenantClaims,
  expectedInfrastructureId?: string | null,
  expectedBusinessId?: string | null
): void {
  if (expectedInfrastructureId && claims.infrastructureId && claims.infrastructureId !== expectedInfrastructureId) {
    throw new HttpError(403, 'Infrastructure scope mismatch', {
      expectedInfrastructureId,
      tokenInfrastructureId: claims.infrastructureId,
    });
  }

  if (expectedBusinessId && claims.businessId && claims.businessId !== expectedBusinessId) {
    throw new HttpError(403, 'Business scope mismatch', {
      expectedBusinessId,
      tokenBusinessId: claims.businessId,
    });
  }
}

export function ensureRoleAllowsInfrastructureTraversal(role: string | null): boolean {
  return !!role && INFRASTRUCTURE_ROLES.has(role);
}
