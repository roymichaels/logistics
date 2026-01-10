import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface OrderUpdate {
  order_id: string;
  status: string;
  driver_id?: string;
  updated_at: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface DriverUpdate {
  driver_id: string;
  status: 'online' | 'offline' | 'busy' | 'available';
  location?: {
    lat: number;
    lng: number;
  };
  current_assignment_id?: string;
  updated_at: string;
}

type OrderUpdateCallback = (update: OrderUpdate) => void;
type DriverUpdateCallback = (update: DriverUpdate) => void;

class RealtimeTrackingService {
  private orderChannels: Map<string, RealtimeChannel> = new Map();
  private driverChannels: Map<string, RealtimeChannel> = new Map();
  private businessOrderChannel: RealtimeChannel | null = null;
  private businessDriverChannel: RealtimeChannel | null = null;

  /**
   * Subscribe to real-time updates for a specific order
   */
  subscribeToOrder(orderId: string, callback: OrderUpdateCallback): () => void {
    if (this.orderChannels.has(orderId)) {
      logger.warn('[RealtimeTracking] Already subscribed to order', { orderId });
      return () => this.unsubscribeFromOrder(orderId);
    }

    logger.info('[RealtimeTracking] Subscribing to order updates', { orderId });

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          logger.debug('[RealtimeTracking] Order update received', { orderId, payload });

          const update: OrderUpdate = {
            order_id: orderId,
            status: payload.new.status,
            driver_id: payload.new.driver_id,
            updated_at: payload.new.updated_at,
          };

          callback(update);
        }
      )
      .subscribe();

    this.orderChannels.set(orderId, channel);

    return () => this.unsubscribeFromOrder(orderId);
  }

  /**
   * Subscribe to real-time updates for a specific driver
   */
  subscribeToDriver(driverId: string, callback: DriverUpdateCallback): () => void {
    if (this.driverChannels.has(driverId)) {
      logger.warn('[RealtimeTracking] Already subscribed to driver', { driverId });
      return () => this.unsubscribeFromDriver(driverId);
    }

    logger.info('[RealtimeTracking] Subscribing to driver updates', { driverId });

    const channel = supabase
      .channel(`driver:${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_profiles',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          logger.debug('[RealtimeTracking] Driver update received', { driverId, payload });

          const update: DriverUpdate = {
            driver_id: driverId,
            status: payload.new.status,
            location: payload.new.current_location,
            current_assignment_id: payload.new.current_assignment_id,
            updated_at: payload.new.updated_at,
          };

          callback(update);
        }
      )
      .subscribe();

    this.driverChannels.set(driverId, channel);

    return () => this.unsubscribeFromDriver(driverId);
  }

  /**
   * Subscribe to all orders for a business (for business owners and dispatchers)
   */
  subscribeToBusinessOrders(businessId: string, callback: OrderUpdateCallback): () => void {
    if (this.businessOrderChannel) {
      logger.warn('[RealtimeTracking] Already subscribed to business orders');
      return () => this.unsubscribeFromBusinessOrders();
    }

    logger.info('[RealtimeTracking] Subscribing to business orders', { businessId });

    this.businessOrderChannel = supabase
      .channel(`business-orders:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          logger.debug('[RealtimeTracking] Business order update', { businessId, event: payload.eventType });

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const update: OrderUpdate = {
              order_id: payload.new.id,
              status: payload.new.status,
              driver_id: payload.new.driver_id,
              updated_at: payload.new.updated_at,
            };

            callback(update);
          }
        }
      )
      .subscribe();

    return () => this.unsubscribeFromBusinessOrders();
  }

  /**
   * Subscribe to all drivers for a business (for dispatchers)
   */
  subscribeToBusinessDrivers(businessId: string, callback: DriverUpdateCallback): () => void {
    if (this.businessDriverChannel) {
      logger.warn('[RealtimeTracking] Already subscribed to business drivers');
      return () => this.unsubscribeFromBusinessDrivers();
    }

    logger.info('[RealtimeTracking] Subscribing to business drivers', { businessId });

    this.businessDriverChannel = supabase
      .channel(`business-drivers:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_profiles',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          logger.debug('[RealtimeTracking] Business driver update', { businessId });

          const update: DriverUpdate = {
            driver_id: payload.new.id,
            status: payload.new.status,
            location: payload.new.current_location,
            current_assignment_id: payload.new.current_assignment_id,
            updated_at: payload.new.updated_at,
          };

          callback(update);
        }
      )
      .subscribe();

    return () => this.unsubscribeFromBusinessDrivers();
  }

  /**
   * Unsubscribe from order updates
   */
  private unsubscribeFromOrder(orderId: string): void {
    const channel = this.orderChannels.get(orderId);
    if (channel) {
      channel.unsubscribe();
      this.orderChannels.delete(orderId);
      logger.info('[RealtimeTracking] Unsubscribed from order', { orderId });
    }
  }

  /**
   * Unsubscribe from driver updates
   */
  private unsubscribeFromDriver(driverId: string): void {
    const channel = this.driverChannels.get(driverId);
    if (channel) {
      channel.unsubscribe();
      this.driverChannels.delete(driverId);
      logger.info('[RealtimeTracking] Unsubscribed from driver', { driverId });
    }
  }

  /**
   * Unsubscribe from business orders
   */
  private unsubscribeFromBusinessOrders(): void {
    if (this.businessOrderChannel) {
      this.businessOrderChannel.unsubscribe();
      this.businessOrderChannel = null;
      logger.info('[RealtimeTracking] Unsubscribed from business orders');
    }
  }

  /**
   * Unsubscribe from business drivers
   */
  private unsubscribeFromBusinessDrivers(): void {
    if (this.businessDriverChannel) {
      this.businessDriverChannel.unsubscribe();
      this.businessDriverChannel = null;
      logger.info('[RealtimeTracking] Unsubscribed from business drivers');
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.orderChannels.forEach((_, orderId) => this.unsubscribeFromOrder(orderId));
    this.driverChannels.forEach((_, driverId) => this.unsubscribeFromDriver(driverId));
    this.unsubscribeFromBusinessOrders();
    this.unsubscribeFromBusinessDrivers();
    logger.info('[RealtimeTracking] Unsubscribed from all channels');
  }
}

export const realtimeTrackingService = new RealtimeTrackingService();
