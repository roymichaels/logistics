import {
  HttpError,
  decodeTenantClaims,
  requireAccessToken,
  INFRASTRUCTURE_ROLES,
  ensureRoleAllowsInfrastructureTraversal,
} from '../_shared/tenantGuard.ts';
import { getServiceSupabaseClient } from '../_shared/supabaseClient.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PermissionResolutionRequest {
  user_id?: string;
  business_id?: string;
}

interface CanonicalRole {
  role_key: string;
  scope_level: string;
  can_see_financials: boolean;
  can_see_cross_business: boolean;
  permission_keys: string[] | null;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const token = requireAccessToken(req);
    const supabase = getServiceSupabaseClient();

    // Parse request
    const { user_id, business_id }: PermissionResolutionRequest = await req.json();

    const claims = decodeTenantClaims(token);
    const targetUserId = user_id ?? claims.userId;

    if (!targetUserId) {
      throw new HttpError(400, 'user_id is required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const { data: activeContext, error: contextError } = await supabase
      .from('user_active_contexts')
      .select('infrastructure_id, business_id, context_version')
      .eq('user_id', user.id)
      .maybeSingle();

    if (contextError) {
      throw new HttpError(500, 'Failed to load active context', { details: contextError });
    }

    const activeInfrastructureId = activeContext?.infrastructure_id ?? claims.infrastructureId;

    if (!activeInfrastructureId) {
      throw new HttpError(403, 'No active infrastructure scope found for request');
    }

    if (claims.userId && user_id && claims.userId !== user_id) {
      if (!ensureRoleAllowsInfrastructureTraversal(claims.role)) {
        throw new HttpError(403, 'Insufficient role to resolve permissions for another user');
      }
    }

    const targetBusinessId = business_id ?? claims.businessId ?? activeContext?.business_id ?? null;

    let resolvedRoleKey: string | null = null;
    let canonicalRole: CanonicalRole | null = null;
    let targetInfrastructureId = activeInfrastructureId;

    if (targetBusinessId) {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, infrastructure_id, active')
        .eq('id', targetBusinessId)
        .maybeSingle();

      if (businessError) {
        throw new HttpError(500, 'Failed to load business context', { details: businessError });
      }

      if (!business) {
        throw new HttpError(404, 'Business not found for permission resolution');
      }

      if (!business.active) {
        throw new HttpError(403, 'Business is inactive');
      }

      if (business.infrastructure_id !== activeInfrastructureId && !ensureRoleAllowsInfrastructureTraversal(claims.role)) {
        throw new HttpError(403, 'Cannot resolve permissions across infrastructures');
      }

      targetInfrastructureId = business.infrastructure_id;
    }

    // Infrastructure roles are derived directly from JWT role claim
    if (claims.role && INFRASTRUCTURE_ROLES.has(claims.role)) {
      resolvedRoleKey = claims.role;
    } else if (targetBusinessId) {
      const { data: membership, error: membershipError } = await supabase
        .from('business_memberships')
        .select('base_role_key, display_role_key')
        .eq('user_id', targetUserId)
        .eq('business_id', targetBusinessId)
        .maybeSingle();

      if (membershipError) {
        throw new HttpError(500, 'Failed to load user membership', { details: membershipError });
      }

      if (!membership) {
        throw new HttpError(404, 'User is not active in the requested business');
      }

      resolvedRoleKey = membership.base_role_key ?? membership.display_role_key ?? null;
    } else if (claims.role) {
      // As a fallback for users without explicit infrastructure role but with a JWT role claim
      resolvedRoleKey = claims.role;
    }

    if (!resolvedRoleKey) {
      throw new HttpError(403, 'Unable to determine role for permission resolution');
    }

    const { data: roleProfile, error: roleError } = await supabase
      .from('canonical_role_permissions')
      .select('role_key, scope_level, can_see_financials, can_see_cross_business, permission_keys')
      .eq('role_key', resolvedRoleKey)
      .maybeSingle();

    if (roleError) {
      throw new HttpError(500, 'Failed to load canonical role permissions', { details: roleError });
    }

    if (!roleProfile) {
      throw new HttpError(404, `No canonical permissions defined for role ${resolvedRoleKey}`);
    }

    canonicalRole = roleProfile as CanonicalRole;

    if (targetUserId !== user.id && targetBusinessId && ensureRoleAllowsInfrastructureTraversal(claims.role)) {
      await supabase.from('cross_scope_access_log').insert({
        accessor_id: user.id,
        accessor_role: claims.role,
        target_business_id: targetBusinessId,
        access_type: 'read',
        accessed_resource: 'permissions_profile',
        resource_id: targetUserId,
        access_reason: 'resolve_permissions',
        infrastructure_id: targetInfrastructureId,
      });
    }

    await supabase
      .from('user_permissions_cache')
      .upsert({
        user_id: targetUserId,
        business_id: targetBusinessId,
        infrastructure_id: targetInfrastructureId,
        resolved_permissions: canonicalRole.permission_keys ?? [],
        role_key: canonicalRole.role_key,
        can_see_financials: canonicalRole.can_see_financials,
        can_see_cross_business: canonicalRole.can_see_cross_business,
        cache_version: activeContext?.context_version ?? claims.contextVersion ?? 1,
        cached_at: new Date().toISOString(),
      }, { onConflict: 'user_id,infrastructure_id,business_id' });

    await logAuditEvent(supabase, {
      eventType: 'permission_modified',
      actorId: user.id,
      actorRole: claims.role ?? undefined,
      targetEntityType: 'user_permissions',
      targetEntityId: targetUserId,
      businessId: targetBusinessId ?? undefined,
      infrastructureId: targetInfrastructureId ?? undefined,
      action: 'permissions_resolved',
      newState: {
        role_key: canonicalRole.role_key,
        permissions: canonicalRole.permission_keys ?? [],
      },
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        user_id: targetUserId,
        business_id: targetBusinessId,
        infrastructure_id: targetInfrastructureId,
        role_key: canonicalRole.role_key,
        permissions: canonicalRole.permission_keys ?? [],
        can_see_financials: canonicalRole.can_see_financials,
        can_see_cross_business: canonicalRole.can_see_cross_business,
        scope_level: canonicalRole.scope_level,
        cached_at: new Date().toISOString(),
        cache_version: activeContext?.context_version ?? claims.contextVersion ?? 1,
        from_cache: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        {
          status: error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('Permission resolution error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
