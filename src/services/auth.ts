import { logger } from '../lib/logger';

export interface SwitchContextOptions {
  infrastructureId?: string | null;
  businessId?: string | null;
  sessionMetadata?: Record<string, unknown>;
  refreshSession?: boolean;
}

export interface TenantClaims {
  userId: string | null;
  role: string | null;
  infrastructureId: string | null;
  businessId: string | null;
  businessRole?: string | null;
  contextVersion?: number | null;
  contextRefreshedAt?: string | null;
}

export interface ActiveContext {
  infrastructure_id: string | null;
  business_id: string | null;
  context_version: number;
  last_switched_at: string;
}

export interface PermissionProfile {
  role: string;
  permissions: string[];
  businessId?: string | null;
}

export interface SwitchContextResponse {
  success: boolean;
  context: {
    business_id: string | null;
    infrastructure_id: string | null;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

export async function getCurrentSession(): Promise<any | null> {
  logger.warn('[AUTH] getCurrentSession called in frontend-only mode - returning null');
  return null;
}

export function getTenantClaims(session: any | null): TenantClaims {
  logger.debug('[AUTH] getTenantClaims called in frontend-only mode');

  if (!session) {
    return {
      userId: null,
      role: null,
      infrastructureId: null,
      businessId: null,
    };
  }

  return {
    userId: session.wallet || null,
    role: session.role || 'customer',
    infrastructureId: null,
    businessId: null,
  };
}

export async function getActiveContext(): Promise<ActiveContext | null> {
  logger.warn('[AUTH] getActiveContext called in frontend-only mode - returning null');
  return null;
}

export async function resolvePermissions(options: {
  userId?: string;
  businessId?: string | null;
} = {}): Promise<PermissionProfile> {
  logger.warn('[AUTH] resolvePermissions called in frontend-only mode - returning default permissions');

  return {
    role: 'customer',
    permissions: ['view:catalog', 'create:order'],
    businessId: options.businessId || null,
  };
}

export async function switchContext(options: SwitchContextOptions = {}): Promise<SwitchContextResponse> {
  logger.warn('[AUTH] switchContext called in frontend-only mode - returning mock response');

  return {
    success: true,
    context: {
      business_id: options.businessId || null,
      infrastructure_id: options.infrastructureId || null,
    },
  };
}

export async function refreshSession(): Promise<any> {
  logger.warn('[AUTH] refreshSession called in frontend-only mode - returning null');
  return null;
}
