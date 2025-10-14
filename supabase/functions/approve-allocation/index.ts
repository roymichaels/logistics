import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ApprovalRequest {
  allocation_id: string;
  approved_quantity: number;
  action: 'approve' | 'reject';
  rejection_reason?: string;
  auto_fulfill?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
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

    // Only infrastructure warehouse workers and owners can approve
    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['infrastructure_owner', 'infrastructure_warehouse'].includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only infrastructure warehouse staff can approve allocations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: ApprovalRequest = await req.json();

    if (!request.allocation_id || !request.action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get allocation
    const { data: allocation } = await supabase
      .from('stock_allocations')
      .select('*')
      .eq('id', request.allocation_id)
      .single();

    if (!allocation) {
      return new Response(
        JSON.stringify({ error: 'Allocation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (allocation.allocation_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Allocation already ${allocation.allocation_status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.action === 'reject') {
      // Reject allocation
      const { error: updateError } = await supabase
        .from('stock_allocations')
        .update({
          allocation_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: request.rejection_reason,
        })
        .eq('id', request.allocation_id);

      if (updateError) throw updateError;

      await supabase.from('system_audit_log').insert({
        event_type: 'inventory_transferred',
        actor_id: user.id,
        actor_role: userData.role,
        target_entity_type: 'stock_allocation',
        target_entity_id: request.allocation_id,
        business_id: allocation.to_business_id,
        action: 'allocation_rejected',
        change_summary: request.rejection_reason,
        severity: 'warning',
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Allocation rejected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Approve allocation
    if (request.approved_quantity <= 0 || request.approved_quantity > allocation.requested_quantity) {
      return new Response(
        JSON.stringify({ error: 'Invalid approved quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check inventory availability
    const { data: sourceInventory } = await supabase
      .from('inventory_locations')
      .select('on_hand_quantity, reserved_quantity')
      .eq('location_id', allocation.from_warehouse_id)
      .eq('product_id', allocation.product_id)
      .maybeSingle();

    const availableQuantity = sourceInventory
      ? sourceInventory.on_hand_quantity - sourceInventory.reserved_quantity
      : 0;

    if (availableQuantity < request.approved_quantity) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient inventory at source',
          available: availableQuantity,
          approved: request.approved_quantity,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update allocation
    const { error: updateError } = await supabase
      .from('stock_allocations')
      .update({
        allocation_status: request.auto_fulfill ? 'delivered' : 'approved',
        approved_quantity: request.approved_quantity,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        delivered_quantity: request.auto_fulfill ? request.approved_quantity : 0,
        delivered_by: request.auto_fulfill ? user.id : null,
        delivered_at: request.auto_fulfill ? new Date().toISOString() : null,
      })
      .eq('id', request.allocation_id);

    if (updateError) throw updateError;

    if (request.auto_fulfill) {
      // Execute the transfer immediately
      // Decrease from source
      await supabase.rpc('adjust_inventory', {
        p_location_id: allocation.from_warehouse_id,
        p_product_id: allocation.product_id,
        p_quantity_change: -request.approved_quantity,
      });

      // Increase at destination
      await supabase.rpc('adjust_inventory', {
        p_location_id: allocation.to_warehouse_id,
        p_product_id: allocation.product_id,
        p_quantity_change: request.approved_quantity,
      });

      // Log the movement
      await supabase.from('inventory_movements').insert({
        movement_type: 'infrastructure_allocation',
        product_id: allocation.product_id,
        from_warehouse_id: allocation.from_warehouse_id,
        to_warehouse_id: allocation.to_warehouse_id,
        quantity: request.approved_quantity,
        business_id: allocation.to_business_id,
        reference_number: allocation.allocation_number,
        moved_by: user.id,
        approved_by: user.id,
      });
    }

    await supabase.from('system_audit_log').insert({
      event_type: 'inventory_transferred',
      actor_id: user.id,
      actor_role: userData.role,
      target_entity_type: 'stock_allocation',
      target_entity_id: request.allocation_id,
      business_id: allocation.to_business_id,
      action: request.auto_fulfill ? 'allocation_fulfilled' : 'allocation_approved',
      change_summary: `Approved ${request.approved_quantity} units`,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: request.auto_fulfill
          ? 'Allocation approved and fulfilled'
          : 'Allocation approved. Ready for fulfillment.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
