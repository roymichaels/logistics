import type { Session } from '@supabase/supabase-js';
import { invalidatePermissionsCache } from '../lib/dynamicPermissions';
import { getSupabase, isSupabaseInitialized } from '../lib/supabaseClient';
import { ensureSession, callEdgeFunction } from './serviceHelpers';
import type { ActiveContext, PermissionProfile, SwitchContextResponse, TenantClaims } from './types';

export interface SwitchContextOptions {
  infrastructureId?: string | null;
  businessId?: string | null;
  sessionMetadata?: Record<string, unknown>;
  refreshSession?: boolean;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseInitialized()) {
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  return data.session ?? null;
}

export function getTenantClaims(session: Session | null): TenantClaims {
  if (!session?.user) {
    return {
      userId: null,
      role: null,
      infrastructureId: null,
      businessId: null,
    };
  }

  const metadata = session.user.app_metadata ?? {};

  return {
    userId: session.user.id,
    role: (metadata.role as string | null) ?? null,
    infrastructureId: (metadata.infrastructure_id as string | null) ?? null,
    businessId: (metadata.business_id as string | null) ?? null,
    businessRole: (metadata.business_role as string | null) ?? null,
    contextVersion: (metadata.context_version as number | null) ?? null,
    contextRefreshedAt: (metadata.context_refreshed_at as string | null) ?? null,
  };
}

export async function getActiveContext(): Promise<ActiveContext | null> {
  const { supabase, session } = await ensureSession();

  const { data, error } = await supabase
    .from('user_active_contexts')
    .select('infrastructure_id, business_id, context_version, last_switched_at')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active context: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as ActiveContext;
}

export async function resolvePermissions(options: {
  userId?: string;
  businessId?: string | null;
} = {}): Promise<PermissionProfile> {
  const { supabase, session } = await ensureSession();

  const payload = {
    user_id: options.userId ?? session.user.id,
    business_id: options.businessId ?? undefined,
  };

  const profile = await callEdgeFunction<PermissionProfile>(supabase, 'resolve-permissions', payload);
  return profile;
}

export async function switchContext(options: SwitchContextOptions = {}): Promise<SwitchContextResponse> {
  const { supabase, session } = await ensureSession();

  const previousBusinessId = (session.user.app_metadata?.business_id as string | null) ?? null;
  const payload = {
    infrastructure_id: options.infrastructureId ?? null,
    business_id: options.businessId ?? null,
    refresh_token: options.refreshSession === false ? null : session.refresh_token,
    session_metadata: options.sessionMetadata ?? {},
  };

  const response = await callEdgeFunction<SwitchContextResponse>(supabase, 'switch-context', payload);

  if (!response.success) {
    throw new Error('Context switch failed');
  }

  if (response.session?.access_token && response.session.refresh_token) {
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: response.session.access_token,
      refresh_token: response.session.refresh_token,
    });

    if (setSessionError) {
      throw new Error(`Failed to update session after context switch: ${setSessionError.message}`);
    }
  } else if (options.refreshSession !== false) {
    await supabase.auth.refreshSession();
  }

  const userId = session.user.id;
  invalidatePermissionsCache(userId, previousBusinessId);
  invalidatePermissionsCache(userId, response.context.business_id ?? null);
  invalidatePermissionsCache(userId, null);

  return response;
}

export async function refreshSession(): Promise<Session> {
  const { supabase, session } = await ensureSession();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw new Error(`Failed to refresh session: ${error.message}`);
  }

  return data.session ?? session;
}
