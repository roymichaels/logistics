import { supabase } from './supabase';
import { logger } from './logger';
import { RealtimeChannel } from '@supabase/supabase-js';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

interface OrderUpdate {
  id: string;
  status: OrderStatus;
  updated_at: string;
  driver_id?: string | null;
  delivery_notes?: string | null;
}

type OrderUpdateCallback = (update: OrderUpdate) => void;
type OrderStatusChangeCallback = (orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus) => void;

class RealtimeOrderTracker {
  private channels: Map<string, RealtimeChannel> = new Map();
  private orderCallbacks: Map<string, Set<OrderUpdateCallback>> = new Map();
  private statusCallbacks: Set<OrderStatusChangeCallback> = new Set();
  private businessChannel: RealtimeChannel | null = null;
  private driverChannel: RealtimeChannel | null = null;

  subscribeToOrder(orderId: string, callback: OrderUpdateCallback): () => void {
    if (!this.orderCallbacks.has(orderId)) {
      this.orderCallbacks.set(orderId, new Set());
    }

    this.orderCallbacks.get(orderId)!.add(callback);

    if (!this.channels.has(orderId)) {
      this.setupOrderChannel(orderId);
    }

    logger.info('[RealtimeOrderTracker] Subscribed to order', { orderId });

    return () => {
      this.unsubscribeFromOrder(orderId, callback);
    };
  }

  private unsubscribeFromOrder(orderId: string, callback: OrderUpdateCallback): void {
    const callbacks = this.orderCallbacks.get(orderId);
    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.orderCallbacks.delete(orderId);
        this.cleanupOrderChannel(orderId);
      }
    }

    logger.info('[RealtimeOrderTracker] Unsubscribed from order', { orderId });
  }

  private setupOrderChannel(orderId: string): void {
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
          logger.info('[RealtimeOrderTracker] Order updated', { orderId, payload });
          this.handleOrderUpdate(payload.new as OrderUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_events',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          logger.info('[RealtimeOrderTracker] Order event', { orderId, payload });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('[RealtimeOrderTracker] Order channel subscribed', { orderId });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[RealtimeOrderTracker] Order channel error', { orderId });
        }
      });

    this.channels.set(orderId, channel);
  }

  private cleanupOrderChannel(orderId: string): void {
    const channel = this.channels.get(orderId);
    if (channel) {
      void supabase.removeChannel(channel);
      this.channels.delete(orderId);
      logger.info('[RealtimeOrderTracker] Order channel cleaned up', { orderId });
    }
  }

  private handleOrderUpdate(update: OrderUpdate): void {
    const callbacks = this.orderCallbacks.get(update.id);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(update);
        } catch (error) {
          logger.error('[RealtimeOrderTracker] Error in order callback', error);
        }
      });
    }
  }

  subscribeToBusinessOrders(businessId: string, callback: OrderUpdateCallback): () => void {
    if (this.businessChannel) {
      void supabase.removeChannel(this.businessChannel);
    }

    this.businessChannel = supabase
      .channel(`business:${businessId}:orders`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          logger.info('[RealtimeOrderTracker] Business order update', { businessId, payload });

          if (payload.new) {
            callback(payload.new as OrderUpdate);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('[RealtimeOrderTracker] Business channel subscribed', { businessId });
        }
      });

    return () => {
      if (this.businessChannel) {
        void supabase.removeChannel(this.businessChannel);
        this.businessChannel = null;
      }
      logger.info('[RealtimeOrderTracker] Unsubscribed from business orders', { businessId });
    };
  }

  subscribeToDriverOrders(driverId: string, callback: OrderUpdateCallback): () => void {
    if (this.driverChannel) {
      void supabase.removeChannel(this.driverChannel);
    }

    this.driverChannel = supabase
      .channel(`driver:${driverId}:orders`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          logger.info('[RealtimeOrderTracker] Driver order update', { driverId, payload });

          if (payload.new) {
            callback(payload.new as OrderUpdate);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          logger.info('[RealtimeOrderTracker] New assignment for driver', { driverId, payload });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('[RealtimeOrderTracker] Driver channel subscribed', { driverId });
        }
      });

    return () => {
      if (this.driverChannel) {
        void supabase.removeChannel(this.driverChannel);
        this.driverChannel = null;
      }
      logger.info('[RealtimeOrderTracker] Unsubscribed from driver orders', { driverId });
    };
  }

  onStatusChange(callback: OrderStatusChangeCallback): () => void {
    this.statusCallbacks.add(callback);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  cleanup(): void {
    this.channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });

    this.channels.clear();
    this.orderCallbacks.clear();
    this.statusCallbacks.clear();

    if (this.businessChannel) {
      void supabase.removeChannel(this.businessChannel);
      this.businessChannel = null;
    }

    if (this.driverChannel) {
      void supabase.removeChannel(this.driverChannel);
      this.driverChannel = null;
    }

    logger.info('[RealtimeOrderTracker] All channels cleaned up');
  }
}

export const realtimeOrderTracker = new RealtimeOrderTracker();

export function useOrderTracking(orderId: string | null, onUpdate: OrderUpdateCallback) {
  React.useEffect(() => {
    if (!orderId) return;

    const unsubscribe = realtimeOrderTracker.subscribeToOrder(orderId, onUpdate);

    return () => {
      unsubscribe();
    };
  }, [orderId, onUpdate]);
}

export function useBusinessOrderTracking(businessId: string | null, onUpdate: OrderUpdateCallback) {
  React.useEffect(() => {
    if (!businessId) return;

    const unsubscribe = realtimeOrderTracker.subscribeToBusinessOrders(businessId, onUpdate);

    return () => {
      unsubscribe();
    };
  }, [businessId, onUpdate]);
}

export function useDriverOrderTracking(driverId: string | null, onUpdate: OrderUpdateCallback) {
  React.useEffect(() => {
    if (!driverId) return;

    const unsubscribe = realtimeOrderTracker.subscribeToDriverOrders(driverId, onUpdate);

    return () => {
      unsubscribe();
    };
  }, [driverId, onUpdate]);
}

// Import React for hooks
import React from 'react';
