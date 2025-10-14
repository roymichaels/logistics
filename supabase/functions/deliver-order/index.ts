import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeliverOrderRequest {
  order_id: string;
  proof_url?: string;
  notes?: string;
  gps_location?: { lat: number; lng: number };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, proof_url, notes, gps_location }: DeliverOrderRequest = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, assigned_driver, items, status, business_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify driver is assigned to this order
    if (order.assigned_driver !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You are not assigned to this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order is in deliverable status
    if (!['out_for_delivery', 'ready'].includes(order.status)) {
      return new Response(
        JSON.stringify({ error: `Order cannot be delivered in status: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const deliveryResults = [];

    // Process each item in the order - auto-decrement driver inventory
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const { product_id, quantity } = item;

        // Get current driver inventory
        const { data: driverInv, error: invError } = await supabase
          .from('driver_vehicle_inventory')
          .select('id, current_quantity, reserved_quantity')
          .eq('driver_id', user.id)
          .eq('product_id', product_id)
          .maybeSingle();

        if (driverInv && driverInv.current_quantity >= quantity) {
          // Decrement driver inventory
          const { error: updateError } = await supabase
            .from('driver_vehicle_inventory')
            .update({
              current_quantity: driverInv.current_quantity - quantity,
              reserved_quantity: Math.max(0, driverInv.reserved_quantity - quantity),
              last_sync_at: now,
            })
            .eq('id', driverInv.id);

          if (!updateError) {
            // Log inventory movement
            await supabase
              .from('inventory_movements')
              .insert({
                movement_type: 'delivery_fulfillment',
                product_id: product_id,
                from_driver_id: user.id,
                to_driver_id: null,
                quantity: quantity,
                business_id: order.business_id,
                order_id: order_id,
                movement_reason: 'Order delivered to customer',
                notes: notes || 'Auto-decremented on delivery',
                moved_by: user.id,
                moved_at: now,
              });

            deliveryResults.push({
              product_id,
              quantity,
              status: 'decremented',
            });
          } else {
            deliveryResults.push({
              product_id,
              quantity,
              status: 'error',
              error: updateError.message,
            });
          }
        } else {
          deliveryResults.push({
            product_id,
            quantity,
            status: 'insufficient_inventory',
            available: driverInv?.current_quantity || 0,
          });
        }
      }
    }

    // Update order status to delivered
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: now,
        delivery_proof_url: proof_url,
        notes: notes ? `${order.notes || ''}\n${notes}` : order.notes,
        metadata: {
          ...order.metadata,
          gps_location,
          delivery_results: deliveryResults,
        },
      })
      .eq('id', order_id);

    if (orderUpdateError) {
      throw orderUpdateError;
    }

    // Log driver movement
    await supabase
      .from('driver_movement_logs')
      .insert({
        driver_id: user.id,
        action: 'order_assigned',
        details: `Delivered order ${order_id}`,
        product_id: null,
        quantity_change: null,
      });

    // Create audit log
    await supabase
      .from('system_audit_log')
      .insert({
        event_type: 'order_updated',
        actor_id: user.id,
        target_entity_type: 'orders',
        target_entity_id: order_id,
        business_id: order.business_id,
        action: 'order_delivered',
        previous_state: { status: order.status },
        new_state: { status: 'delivered', delivered_at: now },
        severity: 'info',
      });

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        status: 'delivered',
        delivered_at: now,
        inventory_updates: deliveryResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Deliver order error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
