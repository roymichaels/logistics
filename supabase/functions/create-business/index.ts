import { corsHeaders } from '../_shared/cors.ts';
import {
  HttpError,
  decodeTenantClaims,
  requireAccessToken,
  ensureRoleAllowsInfrastructureTraversal,
} from '../_shared/tenantGuard.ts';
import { getServiceSupabaseClient } from '../_shared/supabaseClient.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';

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

async function getActiveContext(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  userId: string
) {
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

    if (!ensureRoleAllowsInfrastructureTraversal(claims.role)) {
      throw new HttpError(403, 'Only infrastructure roles can create businesses');
    }

    const activeContext = await getActiveContext(supabase, user.id);
    let infrastructureId = payload.infrastructure_id ?? activeContext?.infrastructure_id ?? claims.infrastructureId;

    // If no infrastructure exists, create a default one
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