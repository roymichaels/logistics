import { corsHeaders } from '../_shared/cors.ts';
import {
  HttpError,
  decodeTenantClaims,
  requireAccessToken,
  ensureRoleAllowsInfrastructureTraversal,
} from '../_shared/tenantGuard.ts';
import { getServiceSupabaseClient } from '../_shared/supabaseClient.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';

interface ApprovalRequest {
  allocation_id: string;
  approved_quantity?: number;
  action: 'approve' | 'reject';
  rejection_reason?: string;
  auto_fulfill?: boolean;
}

const INFRA_APPROVER_ROLES = new Set([
  'infrastructure_owner',
  'infrastructure_manager',
  'infrastructure_warehouse',
]);

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
    const payload: ApprovalRequest = await req.json();

    if (!payload.allocation_id || !payload.action) {
      throw new HttpError(400, 'allocation_id and action are required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    if (!ensureRoleAllowsInfrastructureTraversal(claims.role) || !INFRA_APPROVER_ROLES.has(claims.role ?? '')) {
      throw new HttpError(403, 'Only infrastructure approvers can modify allocations');
    }

    const activeContext = await getActiveContext(supabase, user.id);
    const infrastructureId = activeContext?.infrastructure_id ?? claims.infrastructureId;

    if (!infrastructureId) {
      throw new HttpError(403, 'No active infrastructure scope available');
    }

    const { data: allocation, error: allocationError } = await supabase
      .from('stock_allocations')
      .select('id, from_warehouse_id, to_warehouse_id, to_business_id, product_id, requested_quantity, allocation_status, allocation_number, infrastructure_id')
      .eq('id', payload.allocation_id)
      .maybeSingle();

    if (allocationError) {
      throw new HttpError(500, 'Failed to load allocation', { details: allocationError });
    }

    if (!allocation) {
      throw new HttpError(404, 'Allocation not found');
    }

    if (allocation.infrastructure_id !== infrastructureId) {
      throw new HttpError(403, 'Allocation belongs to a different infrastructure');
    }

    if (allocation.allocation_status !== 'pending') {
      throw new HttpError(400, `Allocation already ${allocation.allocation_status}`);
    }

    if (payload.action === 'reject') {
      const { error: updateError } = await supabase
        .from('stock_allocations')
        .update({
          allocation_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: payload.rejection_reason,
        })
        .eq('id', payload.allocation_id);

      if (updateError) {
        throw new HttpError(500, 'Failed to reject allocation', { details: updateError });
      }

      await logAuditEvent(supabase, {
        eventType: 'inventory_transferred',
        actorId: user.id,
        actorRole: claims.role ?? undefined,
        targetEntityType: 'stock_allocation',
        targetEntityId: payload.allocation_id,
        businessId: allocation.to_business_id,
        infrastructureId: infrastructureId,
        action: 'allocation_rejected',
        changeSummary: payload.rejection_reason,
        severity: 'warning',
      });

      return new Response(JSON.stringify({ success: true, message: 'Allocation rejected' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.approved_quantity || payload.approved_quantity <= 0) {
      throw new HttpError(400, 'approved_quantity must be provided when approving');
    }

    if (payload.approved_quantity > allocation.requested_quantity) {
      throw new HttpError(400, 'approved_quantity cannot exceed requested quantity');
    }

    const { data: sourceInventory, error: inventoryError } = await supabase
      .from('inventory_locations')
      .select('on_hand_quantity, reserved_quantity')
      .eq('location_id', allocation.from_warehouse_id)
      .eq('product_id', allocation.product_id)
      .maybeSingle();

    if (inventoryError) {
      throw new HttpError(500, 'Failed to load source inventory', { details: inventoryError });
    }

    const availableQuantity = sourceInventory
      ? Number(sourceInventory.on_hand_quantity) - Number(sourceInventory.reserved_quantity)
      : 0;

    if (availableQuantity < payload.approved_quantity) {
      throw new HttpError(400, 'Insufficient inventory at source warehouse', {
        availableQuantity,
        approvedQuantity: payload.approved_quantity,
      });
    }

    const newStatus = payload.auto_fulfill ? 'delivered' : 'approved';
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('stock_allocations')
      .update({
        allocation_status: newStatus,
        approved_quantity: payload.approved_quantity,
        approved_by: user.id,
        approved_at: now,
        delivered_quantity: payload.auto_fulfill ? payload.approved_quantity : 0,
        delivered_by: payload.auto_fulfill ? user.id : null,
        delivered_at: payload.auto_fulfill ? now : null,
      })
      .eq('id', payload.allocation_id);

    if (updateError) {
      throw new HttpError(500, 'Failed to update allocation', { details: updateError });
    }

    if (payload.auto_fulfill) {
      const transferPayload = {
        p_location_id: allocation.from_warehouse_id,
        p_product_id: allocation.product_id,
        p_quantity_change: -payload.approved_quantity,
      };

      const fulfillPayload = {
        p_location_id: allocation.to_warehouse_id,
        p_product_id: allocation.product_id,
        p_quantity_change: payload.approved_quantity,
      };

      const decrement = await supabase.rpc('adjust_inventory', transferPayload);
      if (decrement.error) {
        throw new HttpError(500, 'Failed to decrement source inventory', { details: decrement.error });
      }

      const increment = await supabase.rpc('adjust_inventory', fulfillPayload);
      if (increment.error) {
        throw new HttpError(500, 'Failed to increment destination inventory', { details: increment.error });
      }

      const { error: movementError } = await supabase.from('inventory_movements').insert({
        movement_type: 'infrastructure_allocation',
        product_id: allocation.product_id,
        from_warehouse_id: allocation.from_warehouse_id,
        to_warehouse_id: allocation.to_warehouse_id,
        quantity: payload.approved_quantity,
        business_id: allocation.to_business_id,
        infrastructure_id: infrastructureId,
        reference_number: allocation.allocation_number,
        moved_by: user.id,
        approved_by: user.id,
      });

      if (movementError) {
        throw new HttpError(500, 'Failed to record inventory movement', { details: movementError });
      }
    }

    await logAuditEvent(supabase, {
      eventType: 'inventory_transferred',
      actorId: user.id,
      actorRole: claims.role ?? undefined,
      targetEntityType: 'stock_allocation',
      targetEntityId: payload.allocation_id,
      businessId: allocation.to_business_id,
      infrastructureId: infrastructureId,
      action: payload.auto_fulfill ? 'allocation_fulfilled' : 'allocation_approved',
      changeSummary: `Approved ${payload.approved_quantity} units`,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: payload.auto_fulfill
          ? 'Allocation approved and fulfilled'
          : 'Allocation approved. Ready for fulfillment.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Approval error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
