import { createClient } from 'npm:@supabase/supabase-js@2';
import { logAuditEvent } from '../_shared/auditLog.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LoadRequest {
  driver_id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  vehicle_identifier?: string;
  zone_id?: string;
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

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    // Only warehouse staff, managers, and dispatchers can load driver inventory
    const allowedRoles = [
      'infrastructure_owner',
      'infrastructure_warehouse',
      'infrastructure_dispatcher',
      'business_owner',
      'manager',
      'warehouse',
      'dispatcher',
    ];

    if (!userData || !allowedRoles.includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: LoadRequest = await req.json();

    if (!request.driver_id || !request.warehouse_id || !request.product_id || !request.quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.quantity <= 0) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify driver exists and is active
    const { data: driver } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', request.driver_id)
      .single();

    if (!driver || !['driver', 'infrastructure_driver'].includes(driver.role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid driver' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify warehouse and get business context
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id, business_id, infrastructure_id, is_active')
      .eq('id', request.warehouse_id)
      .single();

    if (!warehouse || !warehouse.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive warehouse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check warehouse inventory availability
    const { data: warehouseInventory } = await supabase
      .from('inventory_locations')
      .select('on_hand_quantity, reserved_quantity')
      .eq('location_id', request.warehouse_id)
      .eq('product_id', request.product_id)
      .maybeSingle();

    const availableQuantity = warehouseInventory
      ? warehouseInventory.on_hand_quantity - warehouseInventory.reserved_quantity
      : 0;

    if (availableQuantity < request.quantity) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient inventory at warehouse',
          available: availableQuantity,
          requested: request.quantity,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrease warehouse inventory
    await supabase.rpc('adjust_inventory', {
      p_location_id: request.warehouse_id,
      p_product_id: request.product_id,
      p_quantity_change: -request.quantity,
    });

    // Update or create driver vehicle inventory
    const { data: existingDriverInv } = await supabase
      .from('driver_vehicle_inventory')
      .select('id, current_quantity')
      .eq('driver_id', request.driver_id)
      .eq('product_id', request.product_id)
      .eq('vehicle_identifier', request.vehicle_identifier || '')
      .maybeSingle();

    if (existingDriverInv) {
      // Update existing
      await supabase
        .from('driver_vehicle_inventory')
        .update({
          current_quantity: existingDriverInv.current_quantity + request.quantity,
          last_sync_at: new Date().toISOString(),
          current_zone_id: request.zone_id,
        })
        .eq('id', existingDriverInv.id);
    } else {
      // Create new
      await supabase
        .from('driver_vehicle_inventory')
        .insert({
          driver_id: request.driver_id,
          product_id: request.product_id,
          vehicle_identifier: request.vehicle_identifier,
          current_quantity: request.quantity,
          current_zone_id: request.zone_id,
          source_warehouse_id: request.warehouse_id,
          business_id: warehouse.business_id,
          loaded_at: new Date().toISOString(),
        });
    }

    // Log the movement
    await supabase.from('inventory_movements').insert({
      movement_type: 'driver_loading',
      product_id: request.product_id,
      from_warehouse_id: request.warehouse_id,
      to_driver_id: request.driver_id,
      quantity: request.quantity,
      business_id: warehouse.business_id,
      notes: request.notes,
      moved_by: user.id,
    });

    // Log driver movement
    await supabase.from('driver_movement_log').insert({
      driver_id: request.driver_id,
      zone_id: request.zone_id,
      product_id: request.product_id,
      quantity_change: request.quantity,
      action: 'inventory_added',
      details: `Loaded ${request.quantity} units from warehouse`,
    });

    // Audit log
    await logAuditEvent(supabase, {
      eventType: 'inventory_transferred',
      actorId: user.id,
      actorRole: userData.role ?? undefined,
      targetEntityType: 'driver_inventory',
      targetEntityId: request.driver_id,
      businessId: warehouse.business_id,
      infrastructureId: warehouse.infrastructure_id ?? undefined,
      action: 'driver_inventory_loaded',
      changeSummary: `Loaded ${request.quantity} units to driver vehicle`,
      severity: 'info',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully loaded ${request.quantity} units to driver vehicle`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Load driver inventory error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
