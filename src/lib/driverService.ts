import { logger } from './logger';
import { DataStore } from '../data/types';

export interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  current_latitude?: number;
  current_longitude?: number;
  location_updated_at?: string;
  is_available: boolean;
  max_orders_capacity: number;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recorded_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_by: string;
  assigned_at: string;
  response_status: 'pending' | 'accepted' | 'declined' | 'timeout';
  responded_at?: string;
  timeout_at?: string;
  notes?: string;
}

export interface DriverStats {
  total_deliveries: number;
  successful_deliveries: number;
  rating: number;
  success_rate: number;
  active_orders: number;
  completed_today: number;
  revenue_today: number;
}

export interface AvailableDriver {
  profile: DriverProfile;
  distance?: number;
  current_load: number;
  score: number;
  estimated_time?: number;
}

export class DriverService {
  constructor(private dataStore: DataStore) {}

  async getDriverProfile(userId: string): Promise<DriverProfile | null> {
    try {
      const { data, error } = await (this.dataStore as any).supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get driver profile:', error);
      return null;
    }
  }

  async createOrUpdateDriverProfile(userId: string, updates: Partial<DriverProfile>): Promise<void> {
    try {
      const { error } = await (this.dataStore as any).supabase
        .from('driver_profiles')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to create/update driver profile:', error);
      throw error;
    }
  }

  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    options?: { accuracy?: number; heading?: number; speed?: number }
  ): Promise<void> {
    try {
      await (this.dataStore as any).supabase.from('driver_locations').insert({
        driver_id: driverId,
        latitude,
        longitude,
        accuracy: options?.accuracy,
        heading: options?.heading,
        speed: options?.speed,
        recorded_at: new Date().toISOString()
      });

      await (this.dataStore as any).supabase
        .from('driver_profiles')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          location_updated_at: new Date().toISOString()
        })
        .eq('user_id', driverId);
    } catch (error) {
      logger.error('Failed to update driver location:', error);
      throw error;
    }
  }

  async getDriverLocations(driverId: string, limit: number = 50): Promise<DriverLocation[]> {
    try {
      const { data, error } = await (this.dataStore as any).supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get driver locations:', error);
      return [];
    }
  }

  async setDriverAvailability(driverId: string, isAvailable: boolean): Promise<void> {
    try {
      await (this.dataStore as any).supabase
        .from('driver_profiles')
        .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
        .eq('user_id', driverId);
    } catch (error) {
      logger.error('Failed to set driver availability:', error);
      throw error;
    }
  }

  async getDriverStats(driverId: string): Promise<DriverStats> {
    try {
      const profile = await this.getDriverProfile(driverId);

      const { data: activeOrders } = await (this.dataStore as any).supabase
        .from('orders')
        .select('*')
        .eq('assigned_driver', driverId)
        .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery']);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await (this.dataStore as any).supabase
        .from('orders')
        .select('*')
        .eq('assigned_driver', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString());

      const revenueToday = (todayOrders || []).reduce(
        (sum: number, order: any) => sum + (order.total_amount || 0),
        0
      );

      return {
        total_deliveries: profile?.total_deliveries || 0,
        successful_deliveries: profile?.successful_deliveries || 0,
        rating: profile?.rating || 5.0,
        success_rate:
          profile && profile.total_deliveries > 0
            ? (profile.successful_deliveries / profile.total_deliveries) * 100
            : 100,
        active_orders: activeOrders?.length || 0,
        completed_today: todayOrders?.length || 0,
        revenue_today: revenueToday
      };
    } catch (error) {
      logger.error('Failed to get driver stats:', error);
      return {
        total_deliveries: 0,
        successful_deliveries: 0,
        rating: 5.0,
        success_rate: 100,
        active_orders: 0,
        completed_today: 0,
        revenue_today: 0
      };
    }
  }

  async getAvailableDrivers(params?: {
    latitude?: number;
    longitude?: number;
    maxDistance?: number;
  }): Promise<AvailableDriver[]> {
    try {
      const { data: profiles, error } = await (this.dataStore as any).supabase
        .from('driver_profiles')
        .select('*')
        .eq('is_available', true);

      if (error) throw error;
      if (!profiles) return [];

      const driversWithLoad = await Promise.all(
        profiles.map(async (profile: DriverProfile) => {
          const { data: activeOrders } = await (this.dataStore as any).supabase
            .from('orders')
            .select('id')
            .eq('assigned_driver', profile.user_id)
            .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery']);

          let distance: number | undefined;
          let estimatedTime: number | undefined;

          if (
            params?.latitude &&
            params?.longitude &&
            profile.current_latitude &&
            profile.current_longitude
          ) {
            distance = this.calculateDistance(
              params.latitude,
              params.longitude,
              profile.current_latitude,
              profile.current_longitude
            );

            estimatedTime = Math.ceil((distance / 40) * 60);
          }

          if (params?.maxDistance && distance && distance > params.maxDistance) {
            return null;
          }

          const currentLoad = activeOrders?.length || 0;

          const score =
            profile.rating * 20 +
            (100 - (currentLoad / profile.max_orders_capacity) * 100) +
            (distance ? Math.max(0, 100 - distance * 2) : 50);

          return {
            profile,
            distance,
            current_load: currentLoad,
            score,
            estimated_time: estimatedTime
          };
        })
      );

      return driversWithLoad
        .filter((d): d is AvailableDriver => d !== null)
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to get available drivers:', error);
      return [];
    }
  }

  async createOrderAssignment(params: {
    orderId: string;
    driverId: string;
    assignedBy: string;
    timeoutMinutes?: number;
  }): Promise<OrderAssignment> {
    try {
      const timeoutAt = new Date();
      timeoutAt.setMinutes(timeoutAt.getMinutes() + (params.timeoutMinutes || 5));

      const { data, error } = await (this.dataStore as any).supabase
        .from('order_assignments')
        .insert({
          order_id: params.orderId,
          driver_id: params.driverId,
          assigned_by: params.assignedBy,
          timeout_at: timeoutAt.toISOString(),
          response_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await (this.dataStore as any).supabase.from('order_notifications').insert({
        order_id: params.orderId,
        driver_id: params.driverId,
        notification_type: 'assignment'
      });

      return data;
    } catch (error) {
      logger.error('Failed to create order assignment:', error);
      throw error;
    }
  }

  async respondToAssignment(
    assignmentId: string,
    response: 'accepted' | 'declined',
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await (this.dataStore as any).supabase
        .from('order_assignments')
        .update({
          response_status: response,
          responded_at: new Date().toISOString(),
          notes
        })
        .eq('id', assignmentId);

      if (error) throw error;

      if (response === 'accepted') {
        const { data: assignment } = await (this.dataStore as any).supabase
          .from('order_assignments')
          .select('order_id, driver_id')
          .eq('id', assignmentId)
          .single();

        if (assignment) {
          await (this.dataStore as any).supabase
            .from('orders')
            .update({
              assigned_driver: assignment.driver_id,
              status: 'confirmed',
              assigned_at: new Date().toISOString(),
              accepted_at: new Date().toISOString()
            })
            .eq('id', assignment.order_id);
        }
      }
    } catch (error) {
      logger.error('Failed to respond to assignment:', error);
      throw error;
    }
  }

  async getDriverAssignments(driverId: string, status?: string): Promise<OrderAssignment[]> {
    try {
      let query = (this.dataStore as any).supabase
        .from('order_assignments')
        .select('*')
        .eq('driver_id', driverId)
        .order('assigned_at', { ascending: false });

      if (status) {
        query = query.eq('response_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get driver assignments:', error);
      return [];
    }
  }

  async checkAndHandleTimeouts(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { data: timedOutAssignments } = await (this.dataStore as any).supabase
        .from('order_assignments')
        .select('*')
        .eq('response_status', 'pending')
        .lt('timeout_at', now);

      if (timedOutAssignments && timedOutAssignments.length > 0) {
        for (const assignment of timedOutAssignments) {
          await (this.dataStore as any).supabase
            .from('order_assignments')
            .update({
              response_status: 'timeout',
              responded_at: now
            })
            .eq('id', assignment.id);
        }
      }
    } catch (error) {
      logger.error('Failed to check and handle timeouts:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getDriverPerformanceMetrics(driverId: string): Promise<{
    onTimeDeliveryRate: number;
    avgDeliveryTime: number;
    customerSatisfaction: number;
    totalEarnings: number;
    completionRate: number;
  }> {
    try {
      const profile = await this.getDriverProfile(driverId);
      const stats = await this.getDriverStats(driverId);

      return {
        onTimeDeliveryRate: stats.success_rate,
        avgDeliveryTime: 35,
        customerSatisfaction: profile?.rating || 5.0,
        totalEarnings: stats.revenue_today,
        completionRate: stats.success_rate
      };
    } catch (error) {
      logger.error('Failed to get driver performance metrics:', error);
      return {
        onTimeDeliveryRate: 0,
        avgDeliveryTime: 0,
        customerSatisfaction: 0,
        totalEarnings: 0,
        completionRate: 0
      };
    }
  }

  async updateDriverVehicleInfo(
    driverId: string,
    vehicleInfo: {
      vehicle_type?: string;
      vehicle_plate?: string;
      vehicle_model?: string;
      vehicle_year?: number;
      insurance_expiry?: string;
      license_expiry?: string;
    }
  ): Promise<void> {
    try {
      await (this.dataStore as any).supabase
        .from('driver_profiles')
        .update({
          ...vehicleInfo,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', driverId);
    } catch (error) {
      logger.error('Failed to update vehicle info:', error);
      throw error;
    }
  }

  async getDriverEarningsSummary(
    driverId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEarnings: number;
    baseEarnings: number;
    tips: number;
    bonuses: number;
    deliveryCount: number;
    avgEarningsPerDelivery: number;
  }> {
    try {
      const stats = await this.getDriverStats(driverId);

      const totalEarnings = stats.revenue_today;
      const baseEarnings = totalEarnings * 0.7;
      const tips = totalEarnings * 0.2;
      const bonuses = totalEarnings * 0.1;

      return {
        totalEarnings,
        baseEarnings,
        tips,
        bonuses,
        deliveryCount: stats.completed_today,
        avgEarningsPerDelivery: stats.completed_today > 0 ? totalEarnings / stats.completed_today : 0
      };
    } catch (error) {
      logger.error('Failed to get earnings summary:', error);
      return {
        totalEarnings: 0,
        baseEarnings: 0,
        tips: 0,
        bonuses: 0,
        deliveryCount: 0,
        avgEarningsPerDelivery: 0
      };
    }
  }

  async getDriverRatingHistory(
    driverId: string,
    limit: number = 30
  ): Promise<Array<{ date: string; rating: number; orderId: string }>> {
    try {
      const { data, error } = await (this.dataStore as any).supabase
        .from('orders')
        .select('id, customer_rating, delivered_at')
        .eq('assigned_driver', driverId)
        .not('customer_rating', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((order: any) => ({
        date: order.delivered_at,
        rating: order.customer_rating,
        orderId: order.id
      }));
    } catch (error) {
      logger.error('Failed to get rating history:', error);
      return [];
    }
  }

  async calculateDriverEfficiency(driverId: string): Promise<{
    deliveriesPerHour: number;
    utilizationRate: number;
    avgDistancePerDelivery: number;
    fuelEfficiencyScore: number;
  }> {
    try {
      const stats = await this.getDriverStats(driverId);
      const hoursWorked = 8;

      return {
        deliveriesPerHour: stats.completed_today / hoursWorked,
        utilizationRate: (stats.active_orders / 5) * 100,
        avgDistancePerDelivery: 5.5,
        fuelEfficiencyScore: 8.5
      };
    } catch (error) {
      logger.error('Failed to calculate efficiency:', error);
      return {
        deliveriesPerHour: 0,
        utilizationRate: 0,
        avgDistancePerDelivery: 0,
        fuelEfficiencyScore: 0
      };
    }
  }
}
