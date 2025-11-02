import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';
import {
  HttpError,
  assertTenantScope,
  decodeTenantClaims,
  ensureRoleAllowsInfrastructureTraversal,
  requireAccessToken,
} from '../_shared/tenantGuard.ts';

interface SwitchContextRequest {
  infrastructure_id?: string | null;
  business_id?: string | null;
  refresh_token?: string | null;
  session_metadata?: Record<string, unknown>;
}

interface SwitchContextEnvironment {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

interface SwitchContextDependencies {
  env?: SwitchContextEnvironment;
  createClientImpl?: typeof createClient;
  fetchImpl?: typeof fetch;
}

const RESPONSE_HEADERS = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

function resolveEnv(overrides?: SwitchContextEnvironment): Required<SwitchContextEnvironment> {
  const read = (key: keyof SwitchContextEnvironment) => {
    if (overrides?.[key]) {
      return overrides[key] as string;
    }

    if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
      const value = Deno.env.get(key as string);
      if (value) {
        return value;
      }
    }

    return undefined;
  };

  const supabaseUrl = read('SUPABASE_URL');
  const serviceRoleKey = read('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = read('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    throw new HttpError(500, 'Supabase environment variables are not configured');
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_ANON_KEY: anonKey,
  };
}

async function refreshSession(
  supabaseUrl: string,
  anonKey: string,
  refreshToken: string,
  fetchImpl: typeof fetch
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new HttpError(response.status, 'Failed to refresh session', error);
  }

  return await response.json();
}

export async function handleSwitchContext(
  req: Request,
  deps: SwitchContextDependencies = {}
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: RESPONSE_HEADERS,
    });
  }

  try {
    const env = resolveEnv(deps.env);
    const createClientImpl = deps.createClientImpl ?? createClient;
    const fetchImpl = deps.fetchImpl ?? fetch;

    const supabase = createClientImpl(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as SupabaseClient;

    const token = requireAccessToken(req);
    const tenantClaims = decodeTenantClaims(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const body: SwitchContextRequest = await req.json();
    const requestedInfrastructureId = body.infrastructure_id ?? null;
    const requestedBusinessId = body.business_id ?? null;

    const { data: userRecord, error: profileError } = await supabase
      .from('users')
      .select('id, global_role')
      .eq('id', user.id)
      .single();

    if (profileError || !userRecord) {
      throw new HttpError(404, 'User profile not found');
    }

    let targetInfrastructureId = requestedInfrastructureId;
    let targetBusinessId = requestedBusinessId;

    if (targetBusinessId) {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, infrastructure_id, active')
        .eq('id', targetBusinessId)
        .single();

      if (businessError || !business) {
        throw new HttpError(404, 'Business not found');
      }

      if (!business.active) {
        throw new HttpError(403, 'Business is inactive');
      }

      targetInfrastructureId = targetInfrastructureId ?? business.infrastructure_id;

      if (targetInfrastructureId !== business.infrastructure_id) {
        throw new HttpError(400, 'Business does not belong to requested infrastructure');
      }

      if (!ensureRoleAllowsInfrastructureTraversal(userRecord.global_role)) {
        const { data: membership } = await supabase
          .from('user_business_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('business_id', targetBusinessId)
          .eq('is_active', true)
          .maybeSingle();

        if (!membership) {
          throw new HttpError(403, 'You do not have access to this business');
        }
      }
    } else if (targetInfrastructureId) {
      if (!ensureRoleAllowsInfrastructureTraversal(userRecord.global_role)) {
        throw new HttpError(403, 'Only infrastructure roles can switch infrastructure without a business');
      }
    } else {
      targetInfrastructureId = tenantClaims.infrastructureId ?? null;
    }

    if (!targetInfrastructureId) {
      throw new HttpError(400, 'infrastructure_id is required when switching context');
    }

    const { data: infrastructure, error: infraError } = await supabase
      .from('infrastructures')
      .select('id, is_active, status')
      .eq('id', targetInfrastructureId)
      .maybeSingle();

    if (infraError || !infrastructure) {
      throw new HttpError(404, 'Infrastructure not found');
    }

    if (!infrastructure.is_active || infrastructure.status !== 'active') {
      throw new HttpError(403, 'Infrastructure is not active');
    }

    assertTenantScope(
      tenantClaims,
      tenantClaims.infrastructureId ? targetInfrastructureId : null,
      null
    );

    const sessionMetadata = {
      ...body.session_metadata,
      switched_from_ip: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
    };

    const { data: contextRow, error: contextError } = await supabase.rpc('set_user_active_context', {
      p_user_id: user.id,
      p_infrastructure_id: targetInfrastructureId,
      p_business_id: targetBusinessId,
      p_session_metadata: sessionMetadata,
    });

    if (contextError || !contextRow) {
      throw new HttpError(500, 'Failed to update active context', {
        details: contextError?.message,
      });
    }

    await supabase
      .from('user_permissions_cache')
      .delete()
      .eq('user_id', user.id);

    await logAuditEvent(supabase, {
      eventType: 'context_switch',
      action: 'user_context_switch',
      actorId: user.id,
      infrastructureId: targetInfrastructureId ?? undefined,
      businessId: targetBusinessId ?? undefined,
      severity: 'info',
      newState: {
        infrastructure_id: targetInfrastructureId,
        business_id: targetBusinessId,
        context_version: contextRow.context_version,
      },
    });

    const contextPayload = {
      infrastructure_id: contextRow.infrastructure_id,
      business_id: contextRow.business_id,
      context_version: contextRow.context_version,
      last_switched_at: contextRow.last_switched_at,
    };

    // Get business role if switching to a business context
    let businessRole = tenantClaims.businessRole;
    if (targetBusinessId) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('display_role_key, base_role_key')
        .eq('user_id', user.id)
        .eq('business_id', targetBusinessId)
        .maybeSingle();

      if (membership) {
        businessRole = membership.display_role_key || membership.base_role_key;
      }
    }

    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        role: userRecord.global_role,
        infrastructure_id: contextPayload.infrastructure_id,
        business_id: contextPayload.business_id,
        business_role: businessRole,
        context_version: contextPayload.context_version,
        context_refreshed_at: contextPayload.last_switched_at,
      },
    });

    let refreshedSession: Record<string, unknown> | null = null;

    if (body.refresh_token) {
      refreshedSession = await refreshSession(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        body.refresh_token,
        fetchImpl
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        context: contextPayload,
        session: refreshedSession,
      }),
      {
        status: 200,
        headers: RESPONSE_HEADERS,
      }
    );
  } catch (error) {
    const httpError = error instanceof HttpError
      ? error
      : new HttpError(500, 'Unexpected error', {
          error: error instanceof Error ? error.message : String(error),
        });

    const body = JSON.stringify({
      error: httpError.message,
      details: httpError.details,
    });

    return new Response(body, {
      status: httpError.status,
      headers: RESPONSE_HEADERS,
    });
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(req => handleSwitchContext(req));
}
