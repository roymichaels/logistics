import { logger } from './logger';
import { supabase } from './supabase';

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  status: 'online' | 'busy' | 'offline' | 'break';
}

interface OrderLocation {
  order_id: string;
  latitude: number;
  longitude: number;
  priority: 'normal' | 'urgent';
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function findOptimalDriver(
  orderLat: number,
  orderLon: number,
  businessId: string,
  priority: 'normal' | 'urgent' = 'normal'
): Promise<{ driverId: string | null; distance: number | null }> {
  try {
    const { data: availableDrivers, error } = await supabase
      .from('driver_status')
      .select(`
        driver_id,
        latitude,
        longitude,
        status,
        driver_profiles!inner(
          business_id,
          active,
          rating
        )
      `)
      .eq('status', 'online')
      .eq('driver_profiles.active', true);

    if (error || !availableDrivers || availableDrivers.length === 0) {
      logger.warn('[DriverAssignmentOptimizer] No available drivers found');
      return { driverId: null, distance: null };
    }

    const businessDrivers = availableDrivers.filter(
      (d: any) => d.driver_profiles?.business_id === businessId
    );
    const platformDrivers = availableDrivers.filter(
      (d: any) => !d.driver_profiles?.business_id
    );

    const eligibleDrivers = businessDrivers.length > 0 ? businessDrivers : platformDrivers;

    if (eligibleDrivers.length === 0) {
      logger.warn('[DriverAssignmentOptimizer] No eligible drivers found');
      return { driverId: null, distance: null };
    }

    const driversWithDistance = eligibleDrivers
      .filter((d) => d.latitude && d.longitude)
      .map((driver) => ({
        driver_id: driver.driver_id,
        distance: calculateDistance(
          orderLat,
          orderLon,
          driver.latitude!,
          driver.longitude!
        ),
        rating: driver.driver_profiles?.rating || 5.0
      }))
      .sort((a, b) => {
        if (priority === 'urgent') {
          return a.distance - b.distance;
        }
        return a.distance * 0.7 + (5.0 - a.rating) * 0.3 -
               (b.distance * 0.7 + (5.0 - b.rating) * 0.3);
      });

    if (driversWithDistance.length === 0) {
      return { driverId: null, distance: null };
    }

    const optimal = driversWithDistance[0];
    logger.info('[DriverAssignmentOptimizer] Optimal driver found', {
      driverId: optimal.driver_id,
      distance: optimal.distance
    });

    return {
      driverId: optimal.driver_id,
      distance: optimal.distance
    };
  } catch (error) {
    logger.error('[DriverAssignmentOptimizer] Exception finding optimal driver', error);
    return { driverId: null, distance: null };
  }
}

export async function assignOrderToDriver(
  orderId: string,
  businessId: string,
  orderLat: number,
  orderLon: number,
  priority: 'normal' | 'urgent' = 'normal'
): Promise<{ success: boolean; assignmentId: string | null; error: Error | null }> {
  try {
    const { driverId, distance } = await findOptimalDriver(
      orderLat,
      orderLon,
      businessId,
      priority
    );

    if (!driverId) {
      return {
        success: false,
        assignmentId: null,
        error: new Error('No available drivers found')
      };
    }

    const estimatedDeliveryTime = distance
      ? new Date(Date.now() + distance * 5 * 60000).toISOString()
      : null;

    const { data: assignment, error } = await supabase
      .from('order_assignments')
      .insert({
        order_id: orderId,
        driver_id: driverId,
        business_id: businessId,
        status: 'assigned',
        priority,
        estimated_delivery_time: estimatedDeliveryTime
      })
      .select()
      .single();

    if (error) {
      logger.error('[DriverAssignmentOptimizer] Failed to create assignment', error);
      return { success: false, assignmentId: null, error };
    }

    await supabase
      .from('orders')
      .update({ status: 'assigned' })
      .eq('id', orderId);

    logger.info('[DriverAssignmentOptimizer] Order assigned successfully', {
      orderId,
      driverId,
      assignmentId: assignment.id
    });

    return { success: true, assignmentId: assignment.id, error: null };
  } catch (error) {
    logger.error('[DriverAssignmentOptimizer] Exception assigning order', error);
    return { success: false, assignmentId: null, error: error as Error };
  }
}

export async function reassignOrder(
  assignmentId: string,
  reason?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: assignment, error: fetchError } = await supabase
      .from('order_assignments')
      .select('order_id, business_id, priority')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { success: false, error: fetchError || new Error('Assignment not found') };
    }

    await supabase
      .from('order_assignments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        notes: reason || 'Reassigned'
      })
      .eq('id', assignmentId);

    const { data: order } = await supabase
      .from('orders')
      .select('delivery_address')
      .eq('id', assignment.order_id)
      .single();

    if (!order?.delivery_address) {
      return { success: false, error: new Error('Order location not found') };
    }

    const mockLat = 32.0853;
    const mockLon = 34.7818;

    const result = await assignOrderToDriver(
      assignment.order_id,
      assignment.business_id,
      mockLat,
      mockLon,
      assignment.priority
    );

    return { success: result.success, error: result.error };
  } catch (error) {
    logger.error('[DriverAssignmentOptimizer] Exception reassigning order', error);
    return { success: false, error: error as Error };
  }
}
