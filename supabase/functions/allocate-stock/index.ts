import { corsHeaders } from '../_shared/cors.ts';
import {
  HttpError,
  decodeTenantClaims,
  requireAccessToken,
  ensureRoleAllowsInfrastructureTraversal,
} from '../_shared/tenantGuard.ts';
import { getServiceSupabaseClient } from '../_shared/supabaseClient.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';

interface AllocationRequest {
  from_warehouse_id: string;
  to_warehouse_id: string;
  to_business_id: string;
  product_id: string;
  requested_quantity: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

const ALLOWED_BUSINESS_ROLES = new Set(['business_owner', 'manager', 'warehouse']);

async function getActiveContext(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from('user_active_contexts')
    .select('infrastructure_id, business_id, context_version')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'Failed to load active context', { details: error });
  }

  return data;
}

function validateRequest(payload: AllocationRequest) {
  if (!payload.from_warehouse_id || !payload.to_warehouse_id || !payload.to_business_id) {
    throw new HttpError(400, 'from_warehouse_id, to_warehouse_id and to_business_id are required');
  }

  if (!payload.product_id) {
    throw new HttpError(400, 'product_id is required');
  }

  if (!payload.requested_quantity || payload.requested_quantity <= 0) {
    throw new HttpError(400, 'requested_quantity must be a positive number');
  }
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
    const request: AllocationRequest = await req.json();

    validateRequest(request);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const activeContext = await getActiveContext(supabase, user.id);
    const infrastructureId = activeContext?.infrastructure_id ?? claims.infrastructureId;

    if (!infrastructureId) {
      throw new HttpError(403, 'No active infrastructure scope available');
    }

    const { data: fromWarehouse, error: fromError } = await supabase
      .from('warehouses')
      .select('id, scope_level, infrastructure_id, is_active')
      .eq('id', request.from_warehouse_id)
      .maybeSingle();

    if (fromError) {
      throw new HttpError(500, 'Failed to load source warehouse', { details: fromError });
    }

    if (!fromWarehouse || fromWarehouse.scope_level !== 'infrastructure') {
      throw new HttpError(400, 'Source warehouse must be infrastructure-owned');
    }

    if (!fromWarehouse.is_active) {
      throw new HttpError(400, 'Source warehouse is inactive');
    }

    if (fromWarehouse.infrastructure_id !== infrastructureId) {
      throw new HttpError(403, 'Source warehouse belongs to a different infrastructure');
    }

    const { data: toWarehouse, error: toError } = await supabase
      .from('warehouses')
      .select('id, scope_level, infrastructure_id, business_id, is_active')
      .eq('id', request.to_warehouse_id)
      .maybeSingle();

    if (toError) {
      throw new HttpError(500, 'Failed to load destination warehouse', { details: toError });
    }

    if (!toWarehouse || toWarehouse.scope_level !== 'business') {
      throw new HttpError(400, 'Destination warehouse must be business-owned');
    }

    if (!toWarehouse.is_active) {
      throw new HttpError(400, 'Destination warehouse is inactive');
    }

    if (toWarehouse.business_id !== request.to_business_id) {
      throw new HttpError(400, 'Destination warehouse does not belong to specified business');
    }

    if (toWarehouse.infrastructure_id !== infrastructureId) {
      throw new HttpError(403, 'Destination warehouse belongs to a different infrastructure');
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, active, infrastructure_id')
      .eq('id', request.to_business_id)
      .maybeSingle();

    if (businessError) {
      throw new HttpError(500, 'Failed to load business', { details: businessError });
    }

    if (!business) {
      throw new HttpError(404, 'Business not found');
    }

    if (!business.active) {
      throw new HttpError(403, 'Business is inactive');
    }

    if (business.infrastructure_id !== infrastructureId) {
      throw new HttpError(403, 'Business belongs to a different infrastructure');
    }

    if (!ensureRoleAllowsInfrastructureTraversal(claims.role)) {
      const { data: membership, error: membershipError } = await supabase
        .from('business_memberships')
        .select('base_role_key, display_role_key')
        .eq('user_id', user.id)
        .eq('business_id', request.to_business_id)
        .maybeSingle();

      if (membershipError) {
        throw new HttpError(500, 'Failed to load user membership', { details: membershipError });
      }

      if (!membership) {
        throw new HttpError(403, 'User is not a member of the destination business');
      }

      const resolvedRole = membership.base_role_key ?? membership.display_role_key ?? '';
      if (!ALLOWED_BUSINESS_ROLES.has(resolvedRole)) {
        throw new HttpError(403, 'User role cannot request allocations');
      }
    }

    const { data: sourceInventory, error: inventoryError } = await supabase
      .from('inventory_locations')
      .select('on_hand_quantity, reserved_quantity')
      .eq('location_id', request.from_warehouse_id)
      .eq('product_id', request.product_id)
      .maybeSingle();

    if (inventoryError) {
      throw new HttpError(500, 'Failed to load source inventory', { details: inventoryError });
    }

    const availableQuantity = sourceInventory
      ? Number(sourceInventory.on_hand_quantity) - Number(sourceInventory.reserved_quantity)
      : 0;

    if (availableQuantity < request.requested_quantity) {
      throw new HttpError(400, 'Insufficient inventory at source warehouse', {
        availableQuantity,
        requestedQuantity: request.requested_quantity,
      });
    }

    const { data: allocation, error: allocationError } = await supabase
      .from('stock_allocations')
      .insert({
        from_warehouse_id: request.from_warehouse_id,
        to_warehouse_id: request.to_warehouse_id,
        to_business_id: request.to_business_id,
        product_id: request.product_id,
        requested_quantity: request.requested_quantity,
        allocation_status: 'pending',
        requested_by: user.id,
        priority: request.priority ?? 'normal',
        notes: request.notes,
        infrastructure_id: infrastructureId,
      })
      .select()
      .maybeSingle();

    if (allocationError || !allocation) {
      throw new HttpError(500, 'Failed to create allocation', { details: allocationError });
    }

    await logAuditEvent(supabase, {
      eventType: 'inventory_transferred',
      actorId: user.id,
      actorRole: claims.role ?? undefined,
      targetEntityType: 'stock_allocation',
      targetEntityId: allocation.id,
      businessId: request.to_business_id,
      infrastructureId: infrastructureId,
      action: 'allocation_requested',
      newState: allocation,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        allocation,
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

    console.error('Allocation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
