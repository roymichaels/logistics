import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AllocationRequest {
  from_warehouse_id: string;
  to_warehouse_id: string;
  to_business_id: string;
  product_id: string;
  requested_quantity: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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

    // Check if user has permission to request allocations
    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['infrastructure_owner', 'infrastructure_warehouse', 'business_owner', 'manager', 'warehouse'];
    if (!userData || !allowedRoles.includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to request allocations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: AllocationRequest = await req.json();

    // Validate request
    if (!request.from_warehouse_id || !request.to_warehouse_id || !request.product_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.requested_quantity <= 0) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify from_warehouse is infrastructure-scoped
    const { data: fromWarehouse } = await supabase
      .from('warehouses')
      .select('scope_level, is_active')
      .eq('id', request.from_warehouse_id)
      .single();

    if (!fromWarehouse || fromWarehouse.scope_level !== 'infrastructure') {
      return new Response(
        JSON.stringify({ error: 'Source warehouse must be infrastructure-owned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fromWarehouse.is_active) {
      return new Response(
        JSON.stringify({ error: 'Source warehouse is inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify to_warehouse is business-scoped and belongs to correct business
    const { data: toWarehouse } = await supabase
      .from('warehouses')
      .select('scope_level, business_id, is_active')
      .eq('id', request.to_warehouse_id)
      .single();

    if (!toWarehouse || toWarehouse.scope_level !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Destination warehouse must be business-owned' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (toWarehouse.business_id !== request.to_business_id) {
      return new Response(
        JSON.stringify({ error: 'Destination warehouse does not belong to specified business' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!toWarehouse.is_active) {
      return new Response(
        JSON.stringify({ error: 'Destination warehouse is inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check inventory availability at source warehouse
    const { data: sourceInventory } = await supabase
      .from('inventory_locations')
      .select('on_hand_quantity, reserved_quantity')
      .eq('location_id', request.from_warehouse_id)
      .eq('product_id', request.product_id)
      .maybeSingle();

    const availableQuantity = sourceInventory
      ? sourceInventory.on_hand_quantity - sourceInventory.reserved_quantity
      : 0;

    if (availableQuantity < request.requested_quantity) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient inventory',
          available: availableQuantity,
          requested: request.requested_quantity,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create allocation request
    const { data: allocation, error: allocError } = await supabase
      .from('stock_allocations')
      .insert({
        from_warehouse_id: request.from_warehouse_id,
        to_warehouse_id: request.to_warehouse_id,
        to_business_id: request.to_business_id,
        product_id: request.product_id,
        requested_quantity: request.requested_quantity,
        allocation_status: 'pending',
        requested_by: user.id,
        priority: request.priority || 'normal',
        notes: request.notes,
      })
      .select()
      .single();

    if (allocError) throw allocError;

    // Log the allocation request in audit
    await supabase.from('system_audit_log').insert({
      event_type: 'inventory_transferred',
      actor_id: user.id,
      actor_role: userData.role,
      target_entity_type: 'stock_allocation',
      target_entity_id: allocation.id,
      business_id: request.to_business_id,
      action: 'allocation_requested',
      new_state: allocation,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        allocation,
        message: 'Stock allocation requested successfully. Pending infrastructure approval.',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Allocation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
