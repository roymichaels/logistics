import { DataStore, Order, User } from '../data/types';

export class OrderWorkflowService {
  constructor(private dataStore: DataStore) {}

  /**
   * Assign order to driver and send notification
   */
  async assignOrderToDriver(
    orderId: string,
    driverId: string,
    order: Order,
    currentUser: User
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update order with assigned driver
      await this.dataStore.updateOrder?.(orderId, {
        assigned_driver: driverId,
        status: 'confirmed'
      });

      // Send notification to driver
      await this.dataStore.createNotification?.({
        recipient_id: driverId,
        title: 'הזמנה חדשה הוקצתה',
        message: `הוקצתה לך הזמנה חדשה ללקוח ${order.customer_name}`,
        type: 'order_assigned',
        action_url: `/orders/${orderId}`
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to assign order:', error);
      return { success: false, error: 'שגיאה בהקצאת ההזמנה' };
    }
  }

  /**
   * Notify driver about order status
   */
  async notifyDriver(driverId: string, order: Order, message: string, type: string = 'info'): Promise<void> {
    try {
      await this.dataStore.createNotification?.({
        recipient_id: driverId,
        title: `עדכון הזמנה #${order.id.substring(0, 8)}`,
        message,
        type: type as any,
        action_url: `/orders/${order.id}`
      });
    } catch (error) {
      logger.error('Failed to notify driver:', error);
    }
  }
}
