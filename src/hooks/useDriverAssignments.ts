import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataAccessService } from '../services/dataAccessService';
import { realtimeTrackingService, OrderUpdate } from '../services/realtimeTrackingService';
import { logger } from '../lib/logger';

export interface Assignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    delivery_address: string;
    total_amount: number;
    status: string;
    items_count: number;
  };
}

export function useDriverAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    loadAssignments();

    // Subscribe to real-time updates for assigned orders
    const unsubscribe = subscribeToUpdates();

    return () => {
      unsubscribe();
    };
  }, [user]);

  async function loadAssignments() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const result = await dataAccessService.getDriverAssignments(user.id);

      if (result.error) {
        throw new Error(result.error);
      }

      setAssignments(result.data || []);

      logger.info('[useDriverAssignments] Assignments loaded', {
        count: result.data?.length || 0,
      });
    } catch (err) {
      logger.error('[useDriverAssignments] Failed to load assignments', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  function subscribeToUpdates() {
    if (!user) return () => {};

    const handleOrderUpdate = (update: OrderUpdate) => {
      setAssignments((prevAssignments) =>
        prevAssignments.map((assignment) =>
          assignment.order_id === update.order_id
            ? {
                ...assignment,
                order: {
                  ...assignment.order,
                  status: update.status,
                },
              }
            : assignment
        )
      );

      logger.debug('[useDriverAssignments] Real-time update received', { update });
    };

    // Subscribe to updates for each assigned order
    const unsubscribeFns = assignments.map((assignment) =>
      realtimeTrackingService.subscribeToOrder(assignment.order_id, handleOrderUpdate)
    );

    return () => {
      unsubscribeFns.forEach((fn) => fn());
    };
  }

  async function acceptAssignment(assignmentId: string) {
    try {
      setError(null);

      const { data, error: updateError } = await dataAccessService.updateOrderStatus(assignmentId, 'accepted');

      if (updateError) {
        throw new Error(updateError);
      }

      await loadAssignments();

      logger.info('[useDriverAssignments] Assignment accepted', { assignmentId });

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept assignment';
      logger.error('[useDriverAssignments] Failed to accept assignment', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async function startDelivery(assignmentId: string) {
    try {
      setError(null);

      const { data, error: updateError } = await dataAccessService.updateOrderStatus(assignmentId, 'in_progress');

      if (updateError) {
        throw new Error(updateError);
      }

      await loadAssignments();

      logger.info('[useDriverAssignments] Delivery started', { assignmentId });

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start delivery';
      logger.error('[useDriverAssignments] Failed to start delivery', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async function completeDelivery(assignmentId: string, proofOfDelivery?: { photo?: string; signature?: string; notes?: string }) {
    try {
      setError(null);

      const { data, error: updateError } = await dataAccessService.updateOrderStatus(assignmentId, 'delivered');

      if (updateError) {
        throw new Error(updateError);
      }

      // TODO: Upload proof of delivery if provided

      await loadAssignments();

      logger.info('[useDriverAssignments] Delivery completed', { assignmentId });

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete delivery';
      logger.error('[useDriverAssignments] Failed to complete delivery', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  const activeAssignments = assignments.filter(
    (a) => a.status === 'assigned' || a.status === 'accepted' || a.status === 'in_progress'
  );

  const completedAssignments = assignments.filter((a) => a.status === 'completed');

  return {
    assignments,
    activeAssignments,
    completedAssignments,
    loading,
    error,
    refresh: loadAssignments,
    acceptAssignment,
    startDelivery,
    completeDelivery,
  };
}
