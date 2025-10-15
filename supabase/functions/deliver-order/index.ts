import { corsHeaders } from '../_shared/cors.ts';
import {
  HttpError,
  decodeTenantClaims,
  requireAccessToken,
} from '../_shared/tenantGuard.ts';
import { getServiceSupabaseClient } from '../_shared/supabaseClient.ts';
import { logAuditEvent } from '../_shared/auditLog.ts';

interface DeliverOrderRequest {
  order_id: string;
  proof_url?: string;
  notes?: string;
  gps_location?: { lat: number; lng: number };
}

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
    const payload: DeliverOrderRequest = await req.json();

    if (!payload.order_id) {
      throw new HttpError(400, 'order_id is required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new HttpError(401, 'Unauthorized');
    }

    const activeContext = await getActiveContext(supabase, user.id);
    const infrastructureId = activeContext?.infrastructure_id ?? claims.infrastructureId;

    if (!infrastructureId) {
      throw new HttpError(403, 'No active infrastructure scope available');
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, assigned_driver, items, status, business_id, infrastructure_id, notes, metadata')
      .eq('id', payload.order_id)
      .maybeSingle();

    if (orderError) {
      throw new HttpError(500, 'Failed to load order', { details: orderError });
    }

    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    if (order.infrastructure_id !== infrastructureId) {
      throw new HttpError(403, 'Order belongs to a different infrastructure');
    }

    if (order.assigned_driver !== user.id) {
      throw new HttpError(403, 'You are not assigned to this order');
    }

    if (!['out_for_delivery', 'ready'].includes(order.status)) {
      throw new HttpError(400, `Order cannot be delivered in status: ${order.status}`);
    }

    const now = new Date().toISOString();
    const deliveryResults: Array<Record<string, unknown>> = [];

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const { product_id, quantity } = item;

        const { data: driverInventory, error: driverInvError } = await supabase
          .from('driver_vehicle_inventory')
          .select('id, current_quantity, reserved_quantity')
          .eq('driver_id', user.id)
          .eq('product_id', product_id)
          .maybeSingle();

        if (driverInvError) {
          throw new HttpError(500, 'Failed to load driver inventory', { details: driverInvError });
        }

        if (driverInventory && Number(driverInventory.current_quantity) >= Number(quantity)) {
          const { error: updateError } = await supabase
            .from('driver_vehicle_inventory')
            .update({
              current_quantity: Number(driverInventory.current_quantity) - Number(quantity),
              reserved_quantity: Math.max(0, Number(driverInventory.reserved_quantity) - Number(quantity)),
              last_sync_at: now,
            })
            .eq('id', driverInventory.id);

          if (updateError) {
            throw new HttpError(500, 'Failed to update driver inventory', { details: updateError });
          }

          const { error: movementError } = await supabase.from('inventory_movements').insert({
            movement_type: 'delivery_fulfillment',
            product_id,
            from_driver_id: user.id,
            quantity,
            business_id: order.business_id,
            infrastructure_id: infrastructureId,
            order_id: order.id,
            movement_reason: 'Order delivered to customer',
            notes: payload.notes || 'Auto-decremented on delivery',
            moved_by: user.id,
            moved_at: now,
          });

          if (movementError) {
            throw new HttpError(500, 'Failed to record inventory movement', { details: movementError });
          }

          deliveryResults.push({ product_id, quantity, status: 'decremented' });
        } else {
          deliveryResults.push({
            product_id,
            quantity,
            status: 'insufficient_inventory',
            available: driverInventory?.current_quantity ?? 0,
          });
        }
      }
    }

    const updatedMetadata = {
      ...(order.metadata ?? {}),
      gps_location: payload.gps_location,
      delivery_results: deliveryResults,
    };

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: now,
        delivery_proof_url: payload.proof_url,
        notes: payload.notes ? `${order.notes ?? ''}\n${payload.notes}`.trim() : order.notes,
        metadata: updatedMetadata,
      })
      .eq('id', payload.order_id);

    if (orderUpdateError) {
      throw new HttpError(500, 'Failed to update order', { details: orderUpdateError });
    }

    const { error: movementLogError } = await supabase.from('driver_movement_logs').insert({
      driver_id: user.id,
      action: 'order_delivered',
      details: `Delivered order ${payload.order_id}`,
      infrastructure_id: infrastructureId,
    });

    if (movementLogError) {
      throw new HttpError(500, 'Failed to record driver movement', { details: movementLogError });
    }

    await logAuditEvent(supabase, {
      eventType: 'order_updated',
      actorId: user.id,
      actorRole: claims.role ?? undefined,
      targetEntityType: 'orders',
      targetEntityId: payload.order_id,
      businessId: order.business_id,
      infrastructureId: infrastructureId,
      action: 'order_delivered',
      previousState: { status: order.status },
      newState: { status: 'delivered', delivered_at: now },
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: payload.order_id,
        status: 'delivered',
        delivered_at: now,
        inventory_updates: deliveryResults,
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

    console.error('Deliver order error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
