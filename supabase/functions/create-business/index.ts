import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-app, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const INFRASTRUCTURE_ROLES = new Set([
  'infrastructure_owner',
  'infrastructure_manager',
  'infrastructure_dispatcher',
  'infrastructure_driver',
  'infrastructure_warehouse',
  'infrastructure_accountant',
]);

class HttpError extends Error {
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

function decodeTenantClaims(token: string) {
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

function requireAccessToken(req: Request): string {
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

function ensureRoleAllowsInfrastructureTraversal(role: string | null): boolean {
  return !!role && INFRASTRUCTURE_ROLES.has(role);
}

function getServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new HttpError(500, 'Supabase environment variables are not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function logAuditEvent(supabase: any, payload: any): Promise<void> {
  const auditPayload = {
    event_type: payload.eventType,
    action: payload.action,
    target_entity_type: payload.targetEntityType,
    target_entity_id: payload.targetEntityId,
    business_id: payload.businessId,
    infrastructure_id: payload.infrastructureId,
    actor_id: payload.actorId,
    actor_role: payload.actorRole,
    change_summary: payload.changeSummary,
    severity: payload.severity,
    metadata: payload.metadata ?? {},
    previous_state: payload.previousState ?? null,
    new_state: payload.newState ?? null,
    ip_address: payload.ipAddress,
    user_agent: payload.userAgent,
    session_id: payload.sessionId,
    request_id: payload.requestId,
  };

  try {
    await supabase.rpc('audit_log', { payload: auditPayload }).maybeSingle();
  } catch (error) {
    console.warn('Audit log warning (non-fatal):', error);
  }
}

interface CreateBusinessRequest {
  name: string;
  name_hebrew?: string;
  business_type?: string;
  order_number_prefix?: string;
  default_currency?: 'ILS' | 'USD' | 'EUR';
  primary_color?: string;
  secondary_color?: string;
  infrastructure_id?: string;
  owner_user_id?: string;
  owner_role_key?: string;
}

const DEFAULT_OWNER_ROLE = 'business_owner';
const DEFAULT_PRIMARY_COLOR = '#1B4B66';
const DEFAULT_SECONDARY_COLOR = '#F5A623';

async function getActiveContext(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_active_contexts')
    .select('infrastructure_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'Failed to load active context', { details: error });
  }

  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = getServiceSupabaseClient();
    const token = requireAccessToken(req);
    const claims = decodeTenantClaims(token);
    const payload: CreateBusinessRequest = await req.json();

    if (!payload.name) {
      throw new HttpError(400, 'name is required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const canCreateBusiness = ensureRoleAllowsInfrastructureTraversal(claims.role) || claims.role === 'user' || claims.role === 'business_owner';

    if (!canCreateBusiness) {
      throw new HttpError(403, 'You do not have permission to create businesses');
    }

    const activeContext = await getActiveContext(supabase, user.id);
    let infrastructureId = payload.infrastructure_id ?? activeContext?.infrastructure_id ?? claims.infrastructureId;

    if (!infrastructureId) {
      const { data: existingInfra } = await supabase
        .from('infrastructures')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingInfra) {
        infrastructureId = existingInfra.id;
      } else {
        const { data: newInfra, error: infraError } = await supabase
          .from('infrastructures')
          .insert({
            name: 'Default Infrastructure',
            description: 'Auto-created infrastructure for new businesses'
          })
          .select('id')
          .single();

        if (infraError) {
          throw new HttpError(500, 'Failed to create default infrastructure', { details: infraError });
        }

        infrastructureId = newInfra.id;
      }
    }

    const insertPayload = {
      name: payload.name.trim(),
      name_hebrew: (payload.name_hebrew ?? payload.name).trim(),
      business_type: payload.business_type ?? 'logistics',
      order_number_prefix: (payload.order_number_prefix ?? payload.name.substring(0, 3)).toUpperCase(),
      order_number_sequence: 1000,
      default_currency: payload.default_currency ?? 'ILS',
      primary_color: payload.primary_color ?? DEFAULT_PRIMARY_COLOR,
      secondary_color: payload.secondary_color ?? DEFAULT_SECONDARY_COLOR,
      active: true,
      infrastructure_id: infrastructureId,
    };

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (businessError || !business) {
      throw new HttpError(500, 'Failed to create business', { details: businessError });
    }

    const ownerUserId = payload.owner_user_id ?? user.id;
    const ownerRoleKey = payload.owner_role_key ?? DEFAULT_OWNER_ROLE;

    const { data: ownerRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_key', ownerRoleKey)
      .maybeSingle();

    if (roleError) {
      throw new HttpError(500, 'Failed to load owner role', { details: roleError });
    }

    if (!ownerRole) {
      throw new HttpError(400, `Role ${ownerRoleKey} is not defined`);
    }

    const { error: membershipError } = await supabase
      .from('user_business_roles')
      .insert({
        user_id: ownerUserId,
        business_id: business.id,
        role_id: ownerRole.id,
        is_primary: true,
        assigned_by: user.id,
        infrastructure_id: infrastructureId,
      });

    if (membershipError) {
      await supabase.from('businesses').delete().eq('id', business.id);
      throw new HttpError(500, 'Failed to assign business owner', { details: membershipError });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('global_role, business_id')
      .eq('id', ownerUserId)
      .maybeSingle();

    const userUpdates: any = {};

    if (currentUser && currentUser.global_role === 'user') {
      userUpdates.global_role = 'business_owner';
    }

    if (!currentUser?.business_id) {
      userUpdates.business_id = business.id;
    }

    if (Object.keys(userUpdates).length > 0) {
      await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', ownerUserId);
    }

    try {
      const { data: businessRole } = await supabase
        .from('business_memberships')
        .select('display_role_key, base_role_key')
        .eq('user_id', ownerUserId)
        .eq('business_id', business.id)
        .maybeSingle();

      await supabase.auth.admin.updateUserById(ownerUserId, {
        app_metadata: {
          role: userUpdates.global_role || currentUser?.global_role || 'business_owner',
          business_id: business.id,
          business_role: businessRole?.display_role_key || ownerRoleKey,
          infrastructure_id: infrastructureId,
        },
      });
    } catch (jwtError) {
      console.warn('JWT sync warning (non-fatal):', jwtError);
    }

    await supabase.from('business_lifecycle_log').insert({
      business_id: business.id,
      infrastructure_id: infrastructureId,
      event_type: 'business_created',
      actor_id: user.id,
      notes: `Business created via edge function by ${user.id}`,
    });

    await logAuditEvent(supabase, {
      eventType: 'business_created',
      actorId: user.id,
      actorRole: claims.role ?? undefined,
      targetEntityType: 'businesses',
      targetEntityId: business.id,
      businessId: business.id,
      infrastructureId: infrastructureId,
      action: 'business_created',
      newState: business,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        business,
        owner_role_assigned: true,
        jwt_synced: true,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Create business error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});