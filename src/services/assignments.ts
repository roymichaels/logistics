import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface Assignment {
  id: string;
  order_id: string;
  driver_id: string;
  business_id: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  status: 'assigned' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  priority: 'normal' | 'urgent';
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  notes: string | null;
  proof_of_delivery_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithOrder extends Assignment {
  order: {
    id: string;
    order_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    delivery_instructions: string | null;
    total_amount: number;
    status: string;
    items: Array<{
      product_name: string;
      quantity: number;
      price: number;
    }>;
  };
}

/**
 * Get active assignments for a driver
 */
export async function getDriverActiveAssignments(
  driverId: string,
  businessId?: string | null
): Promise<{ data: AssignmentWithOrder[]; error: Error | null }> {
  try {
    let query = supabase
      .from('order_assignments')
      .select(`
        *,
        order:orders!inner(
          id,
          order_number,
          customer_id,
          delivery_address,
          customer_notes,
          total,
          status
        )
      `)
      .eq('driver_id', driverId)
      .in('status', ['assigned', 'accepted', 'picked_up']);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    query = query
      .order('priority', { ascending: false })
      .order('assigned_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      logger.error('[AssignmentService] Failed to get active assignments', error);
      return { data: [], error };
    }

    // Fetch order items and customer info for each order
    const assignmentsWithItems = await Promise.all(
      (data || []).map(async (assignment: any) => {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            quantity,
            unit_price,
            products(name)
          `)
          .eq('order_id', assignment.order.id);

        // Get customer info
        const { data: customer } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', assignment.order.customer_id)
          .single();

        return {
          ...assignment,
          order: {
            ...assignment.order,
            customer_name: customer?.name || null,
            customer_phone: customer?.phone || null,
            delivery_instructions: assignment.order.customer_notes,
            total_amount: assignment.order.total,
            items: (items || []).map((item: any) => ({
              product_name: item.products?.name || 'Unknown',
              quantity: item.quantity,
              price: item.unit_price
            }))
          }
        };
      })
    );

    return { data: assignmentsWithItems, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception getting active assignments', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Get completed assignments for a driver
 */
export async function getDriverCompletedAssignments(
  driverId: string,
  limit: number = 50
): Promise<{ data: AssignmentWithOrder[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('order_assignments')
      .select(`
        *,
        order:orders!inner(
          id,
          order_number,
          customer_name,
          customer_phone,
          delivery_address,
          delivery_instructions,
          total_amount,
          status
        )
      `)
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[AssignmentService] Failed to get completed assignments', error);
      return { data: [], error };
    }

    const assignmentsWithItems = await Promise.all(
      (data || []).map(async (assignment: any) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, price')
          .eq('order_id', assignment.order.id);

        return {
          ...assignment,
          order: {
            ...assignment.order,
            items: items || []
          }
        };
      })
    );

    return { data: assignmentsWithItems, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception getting completed assignments', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Accept an assignment
 */
export async function acceptAssignment(
  assignmentId: string
): Promise<{ data: Assignment | null; error: Error | null }> {
  try {
    logger.info('[AssignmentService] Accepting assignment', { assignmentId });

    const { data, error } = await supabase
      .from('order_assignments')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('status', 'assigned')
      .select()
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to accept assignment', error);
      return { data: null, error };
    }

    // Update order status to in_transit
    await supabase
      .from('orders')
      .update({ status: 'in_transit' })
      .eq('id', data.order_id);

    logger.info('[AssignmentService] Assignment accepted successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception accepting assignment', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark order as picked up
 */
export async function markOrderPickedUp(
  assignmentId: string
): Promise<{ data: Assignment | null; error: Error | null }> {
  try {
    logger.info('[AssignmentService] Marking order as picked up', { assignmentId });

    const { data, error } = await supabase
      .from('order_assignments')
      .update({
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('status', 'accepted')
      .select()
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to mark as picked up', error);
      return { data: null, error };
    }

    logger.info('[AssignmentService] Order marked as picked up successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception marking picked up', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark order as delivered
 */
export async function markOrderDelivered(
  assignmentId: string,
  proofOfDeliveryUrl?: string
): Promise<{ data: Assignment | null; error: Error | null }> {
  try {
    logger.info('[AssignmentService] Marking order as delivered', { assignmentId });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('order_assignments')
      .update({
        status: 'delivered',
        delivered_at: now,
        actual_delivery_time: now,
        proof_of_delivery_url: proofOfDeliveryUrl || null,
        updated_at: now
      })
      .eq('id', assignmentId)
      .eq('status', 'picked_up')
      .select()
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to mark as delivered', error);
      return { data: null, error };
    }

    // Update order status to delivered
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: now
      })
      .eq('id', data.order_id);

    // Insert photo record if provided
    if (proofOfDeliveryUrl && data.driver_id) {
      await supabase
        .from('delivery_photos')
        .insert({
          assignment_id: assignmentId,
          driver_id: data.driver_id,
          order_id: data.order_id,
          photo_url: proofOfDeliveryUrl,
          photo_type: 'proof_of_delivery'
        });
    }

    logger.info('[AssignmentService] Order marked as delivered successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception marking delivered', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Cancel an assignment
 */
export async function cancelAssignment(
  assignmentId: string,
  reason?: string
): Promise<{ data: Assignment | null; error: Error | null }> {
  try {
    logger.info('[AssignmentService] Cancelling assignment', { assignmentId, reason });

    const { data, error } = await supabase
      .from('order_assignments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        notes: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .in('status', ['assigned', 'accepted'])
      .select()
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to cancel assignment', error);
      return { data: null, error };
    }

    // Update order status back to pending
    await supabase
      .from('orders')
      .update({ status: 'pending' })
      .eq('id', data.order_id);

    logger.info('[AssignmentService] Assignment cancelled successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception cancelling assignment', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get assignment by ID
 */
export async function getAssignment(
  assignmentId: string
): Promise<{ data: AssignmentWithOrder | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('order_assignments')
      .select(`
        *,
        order:orders!inner(
          id,
          order_number,
          customer_name,
          customer_phone,
          delivery_address,
          delivery_instructions,
          total_amount,
          status
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to get assignment', error);
      return { data: null, error };
    }

    // Fetch order items
    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, price')
      .eq('order_id', data.order.id);

    const assignmentWithItems = {
      ...data,
      order: {
        ...data.order,
        items: items || []
      }
    };

    return { data: assignmentWithItems, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception getting assignment', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to new assignments for a driver
 */
export function subscribeToDriverAssignments(
  driverId: string,
  onNewAssignment: (assignment: Assignment) => void,
  onAssignmentUpdate: (assignment: Assignment) => void
) {
  const channel = supabase
    .channel(`driver_${driverId}_assignments`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'driver_assignments',
        filter: `driver_id=eq.${driverId}`
      },
      (payload) => {
        logger.info('[AssignmentService] New assignment received', payload.new);
        onNewAssignment(payload.new as Assignment);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_assignments',
        filter: `driver_id=eq.${driverId}`
      },
      (payload) => {
        logger.info('[AssignmentService] Assignment updated', payload.new);
        onAssignmentUpdate(payload.new as Assignment);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Update assignment notes
 */
export async function updateAssignmentNotes(
  assignmentId: string,
  notes: string
): Promise<{ data: Assignment | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('order_assignments')
      .update({
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      logger.error('[AssignmentService] Failed to update notes', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[AssignmentService] Exception updating notes', error);
    return { data: null, error: error as Error };
  }
}

export const assignmentService = {
  getDriverActiveAssignments,
  getDriverCompletedAssignments,
  acceptAssignment,
  markOrderPickedUp,
  markOrderDelivered,
  cancelAssignment,
  getAssignment,
  subscribeToDriverAssignments,
  updateAssignmentNotes
};
