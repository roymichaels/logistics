/**
 * Authentication Debug Utilities
 *
 * Helper functions to inspect and troubleshoot JWT claims and Supabase sessions
 */

import { supabase } from './supabaseDataStore';

export interface AuthDebugInfo {
  hasSession: boolean;
  sessionValid: boolean;
  userId: string | null;
  email: string | null;
  appMetadata: Record<string, any>;
  userMetadata: Record<string, any>;
  claims: {
    telegram_id?: string;
    role?: string;
    app_role?: string;
    workspace_id?: string;
    user_id?: string;
  };
  accessToken: string | null;
  expiresAt: number | null;
}

/**
 * Get current Supabase session and decode JWT claims
 */
export async function getAuthDebugInfo(): Promise<AuthDebugInfo> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return {
      hasSession: false,
      sessionValid: false,
      userId: null,
      email: null,
      appMetadata: {},
      userMetadata: {},
      claims: {},
      accessToken: null,
      expiresAt: null
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = session.expires_at ? session.expires_at < now : false;

  return {
    hasSession: true,
    sessionValid: !isExpired,
    userId: session.user.id,
    email: session.user.email || null,
    appMetadata: session.user.app_metadata || {},
    userMetadata: session.user.user_metadata || {},
    claims: {
      telegram_id: session.user.app_metadata?.telegram_id || session.user.user_metadata?.telegram_id,
      role: session.user.app_metadata?.role,
      app_role: session.user.app_metadata?.app_role,
      workspace_id: session.user.app_metadata?.workspace_id,
      user_id: session.user.app_metadata?.user_id
    },
    accessToken: session.access_token,
    expiresAt: session.expires_at || null
  };
}

/**
 * Log formatted authentication debug info
 */
export async function logAuthDebug(): Promise<void> {
  const info = await getAuthDebugInfo();

  console.group('🔐 Authentication Debug Info');
  console.log('Session Status:', info.hasSession ? '✅ Active' : '❌ No Session');
  console.log('Session Valid:', info.sessionValid ? '✅ Valid' : '⚠️ Expired');
  console.log('User ID:', info.userId || 'N/A');
  console.log('Email:', info.email || 'N/A');

  console.group('📋 JWT Claims (app_metadata)');
  console.log('role:', info.claims.role || '❌ MISSING');
  console.log('app_role:', info.claims.app_role || '⚠️ Not set');
  console.log('workspace_id:', info.claims.workspace_id || '⚠️ Not set');
  console.log('user_id:', info.claims.user_id || '⚠️ Not set');
  console.log('telegram_id:', info.claims.telegram_id || '❌ MISSING');
  console.groupEnd();

  console.log('Full app_metadata:', info.appMetadata);
  console.log('Full user_metadata:', info.userMetadata);

  if (info.expiresAt) {
    const expiresIn = info.expiresAt - Math.floor(Date.now() / 1000);
    console.log('Expires in:', expiresIn > 0 ? `${Math.floor(expiresIn / 60)} minutes` : 'EXPIRED');
  }

  console.groupEnd();
}

/**
 * Check if session has required claims for user management
 */
export async function validateUserManagementAccess(): Promise<{
  hasAccess: boolean;
  missingClaims: string[];
  role: string | null;
}> {
  const info = await getAuthDebugInfo();

  if (!info.hasSession || !info.sessionValid) {
    return {
      hasAccess: false,
      missingClaims: ['Session'],
      role: null
    };
  }

  const requiredClaims = ['role', 'user_id', 'telegram_id'];
  const missingClaims = requiredClaims.filter(claim => {
    return !info.claims[claim as keyof typeof info.claims];
  });

  // Check if user has management role
  const managementRoles = ['infrastructure_owner', 'owner', 'business_owner', 'manager'];
  const hasManagementRole = info.claims.role && managementRoles.includes(info.claims.role);

  return {
    hasAccess: hasManagementRole && missingClaims.length === 0,
    missingClaims,
    role: info.claims.role || null
  };
}

/**
 * Test RLS access by calling debug function from database
 */
export async function testRLSAccess(): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('debug_auth_claims');

    if (error) {
      console.error('❌ RLS debug function failed:', error);
      return { error: error.message };
    }

    console.log('🔍 RLS Debug Claims from Database:', data);
    return data;
  } catch (err) {
    console.error('❌ Failed to test RLS:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Set Supabase session from auth tokens
 */
export async function setSupabaseSession(accessToken: string, refreshToken: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      console.error('❌ Failed to set session:', error);
      return false;
    }

    console.log('✅ Supabase session set successfully');
    return true;
  } catch (err) {
    console.error('❌ Exception setting session:', err);
    return false;
  }
}
