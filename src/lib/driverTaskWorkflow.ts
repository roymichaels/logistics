import { supabase } from './supabase';
import { logger } from './logger';
import { offlineStore } from '../utils/offlineStore';

export type TaskStatus = 'available' | 'accepted' | 'in_progress' | 'completed' | 'failed';
export type TaskType = 'delivery' | 'pickup' | 'return';

export interface DriverTask {
  id: string;
  order_id: string;
  driver_id: string | null;
  type: TaskType;
  status: TaskStatus;
  pickup_address: {
    street: string;
    city: string;
    coordinates?: { latitude: number; longitude: number };
  };
  delivery_address: {
    street: string;
    city: string;
    coordinates?: { latitude: number; longitude: number };
  };
  customer_name: string;
  customer_phone: string;
  items_count: number;
  estimated_earnings: number;
  distance_km?: number;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface TaskAcceptanceResult {
  success: boolean;
  error?: string;
  task?: DriverTask;
}

export interface TaskCompletionData {
  proof_of_delivery?: {
    photo_url?: string;
    signature_url?: string;
    notes?: string;
  };
  completed_at: string;
  customer_rating?: number;
}

class DriverTaskWorkflow {
  async acceptTask(taskId: string, driverId: string): Promise<TaskAcceptanceResult> {
    try {
      logger.info('[DriverTaskWorkflow] Accepting task', { taskId, driverId });

      const { data: task, error: fetchError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (fetchError) {
        logger.error('[DriverTaskWorkflow] Error fetching task', fetchError);
        return {
          success: false,
          error: 'Failed to fetch task details',
        };
      }

      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      if (task.status !== 'available') {
        return {
          success: false,
          error: `Task is not available (current status: ${task.status})`,
        };
      }

      if (task.driver_id && task.driver_id !== driverId) {
        return {
          success: false,
          error: 'Task is already assigned to another driver',
        };
      }

      const { data: updatedTask, error: updateError } = await supabase
        .from('assignments')
        .update({
          driver_id: driverId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('status', 'available')
        .select()
        .single();

      if (updateError) {
        logger.error('[DriverTaskWorkflow] Error accepting task', updateError);

        if (updateError.code === 'PGRST116') {
          return {
            success: false,
            error: 'Task was just accepted by another driver',
          };
        }

        return {
          success: false,
          error: 'Failed to accept task',
        };
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'assigned',
          driver_id: driverId,
        })
        .eq('id', task.order_id);

      if (orderError) {
        logger.error('[DriverTaskWorkflow] Error updating order', orderError);
      }

      logger.info('[DriverTaskWorkflow] Task accepted successfully', { taskId, driverId });

      return {
        success: true,
        task: updatedTask as unknown as DriverTask,
      };
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Exception accepting task', error);
      return {
        success: false,
        error: 'Unexpected error accepting task',
      };
    }
  }

  async startTask(taskId: string, driverId: string): Promise<TaskAcceptanceResult> {
    try {
      logger.info('[DriverTaskWorkflow] Starting task', { taskId, driverId });

      const { data: updatedTask, error: updateError } = await supabase
        .from('assignments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('driver_id', driverId)
        .eq('status', 'accepted')
        .select()
        .maybeSingle();

      if (updateError) {
        logger.error('[DriverTaskWorkflow] Error starting task', updateError);
        return {
          success: false,
          error: 'Failed to start task',
        };
      }

      if (!updatedTask) {
        return {
          success: false,
          error: 'Task not found or not in accepted state',
        };
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'in_transit',
        })
        .eq('id', updatedTask.order_id);

      if (orderError) {
        logger.error('[DriverTaskWorkflow] Error updating order status', orderError);
      }

      logger.info('[DriverTaskWorkflow] Task started successfully', { taskId, driverId });

      return {
        success: true,
        task: updatedTask as unknown as DriverTask,
      };
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Exception starting task', error);
      return {
        success: false,
        error: 'Unexpected error starting task',
      };
    }
  }

  async completeTask(
    taskId: string,
    driverId: string,
    completionData: TaskCompletionData
  ): Promise<TaskAcceptanceResult> {
    try {
      logger.info('[DriverTaskWorkflow] Completing task', { taskId, driverId });

      const { data: updatedTask, error: updateError } = await supabase
        .from('assignments')
        .update({
          status: 'completed',
          completed_at: completionData.completed_at,
          proof_of_delivery: completionData.proof_of_delivery || {},
        })
        .eq('id', taskId)
        .eq('driver_id', driverId)
        .eq('status', 'in_progress')
        .select()
        .maybeSingle();

      if (updateError) {
        logger.error('[DriverTaskWorkflow] Error completing task', updateError);
        return {
          success: false,
          error: 'Failed to complete task',
        };
      }

      if (!updatedTask) {
        return {
          success: false,
          error: 'Task not found or not in progress',
        };
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: completionData.completed_at,
        })
        .eq('id', updatedTask.order_id);

      if (orderError) {
        logger.error('[DriverTaskWorkflow] Error updating order', orderError);
      }

      const { error: eventError } = await supabase.from('order_events').insert({
        order_id: updatedTask.order_id,
        event_type: 'delivered',
        event_data: {
          driver_id: driverId,
          proof_of_delivery: completionData.proof_of_delivery,
        },
        created_at: completionData.completed_at,
      });

      if (eventError) {
        logger.error('[DriverTaskWorkflow] Error creating order event', eventError);
      }

      logger.info('[DriverTaskWorkflow] Task completed successfully', { taskId, driverId });

      return {
        success: true,
        task: updatedTask as unknown as DriverTask,
      };
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Exception completing task', error);
      return {
        success: false,
        error: 'Unexpected error completing task',
      };
    }
  }

  async getAvailableTasks(driverId: string): Promise<DriverTask[]> {
    try {
      const { data: driverProfile } = await supabase
        .from('profiles')
        .select('zone_id')
        .eq('id', driverId)
        .maybeSingle();

      const zoneId = driverProfile?.zone_id;

      let query = supabase
        .from('assignments')
        .select(
          `
          *,
          orders (
            id,
            customer_name,
            customer_phone,
            delivery_address,
            items:order_items (count)
          )
        `
        )
        .eq('status', 'available')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[DriverTaskWorkflow] Error fetching available tasks', error);
        return [];
      }

      return (data || []) as unknown as DriverTask[];
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Exception fetching tasks', error);
      return [];
    }
  }

  async getMyTasks(driverId: string): Promise<DriverTask[]> {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'in_progress'])
        .order('accepted_at', { ascending: true });

      if (error) {
        logger.error('[DriverTaskWorkflow] Error fetching my tasks', error);
        return [];
      }

      return (data || []) as unknown as DriverTask[];
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Exception fetching my tasks', error);
      return [];
    }
  }

  async queueOfflineCompletion(
    taskId: string,
    driverId: string,
    completionData: TaskCompletionData
  ): Promise<void> {
    try {
      await offlineStore.addMutation({
        type: 'complete_task',
        data: {
          taskId,
          driverId,
          completionData,
        },
        timestamp: Date.now(),
      });

      logger.info('[DriverTaskWorkflow] Task completion queued for offline sync', { taskId });
    } catch (error) {
      logger.error('[DriverTaskWorkflow] Error queuing offline completion', error);
    }
  }
}

export const driverTaskWorkflow = new DriverTaskWorkflow();
