import { DataStore, Order } from '../data/types';
import { DriverService, DriverProfile, AvailableDriver } from './driverService';

export interface AssignmentPreferences {
  preferredZones?: string[];
  maxDistance?: number;
  considerRating?: boolean;
  considerLoad?: boolean;
  considerProximity?: boolean;
  minRating?: number;
}

export interface AssignmentResult {
  success: boolean;
  driverId?: string;
  driver?: AvailableDriver;
  reason?: string;
  score?: number;
  alternatives?: AvailableDriver[];
}

export interface WorkloadDistribution {
  driverId: string;
  driverName: string;
  activeOrders: number;
  capacity: number;
  utilizationPercent: number;
  avgDeliveryTime: number;
  isOverloaded: boolean;
}

export class DriverAssignmentService {
  private driverService: DriverService;

  constructor(private dataStore: DataStore) {
    this.driverService = new DriverService(dataStore);
  }

  async findBestDriver(
    order: Order,
    preferences: AssignmentPreferences = {}
  ): Promise<AssignmentResult> {
    try {
      const customerLat = 32.0853;
      const customerLng = 34.7818;

      const availableDrivers = await this.driverService.getAvailableDrivers({
        latitude: customerLat,
        longitude: customerLng,
        maxDistance: preferences.maxDistance || 50
      });

      if (availableDrivers.length === 0) {
        return {
          success: false,
          reason: 'no_available_drivers',
          alternatives: []
        };
      }

      let filteredDrivers = availableDrivers;

      if (preferences.minRating) {
        filteredDrivers = filteredDrivers.filter(
          d => d.profile.rating >= preferences.minRating!
        );
      }

      if (preferences.preferredZones && preferences.preferredZones.length > 0) {
        const driversInZone = await this.getDriversInZones(preferences.preferredZones);
        filteredDrivers = filteredDrivers.filter(d =>
          driversInZone.includes(d.profile.user_id)
        );
      }

      if (filteredDrivers.length === 0) {
        return {
          success: false,
          reason: 'no_matching_drivers',
          alternatives: availableDrivers.slice(0, 3)
        };
      }

      const scoredDrivers = filteredDrivers.map(driver => {
        let score = driver.score;

        if (preferences.considerRating !== false) {
          score += driver.profile.rating * 15;
        }

        if (preferences.considerLoad !== false) {
          const capacityUtilization = driver.current_load / driver.profile.max_orders_capacity;
          score += (1 - capacityUtilization) * 25;
        }

        if (preferences.considerProximity !== false && driver.distance) {
          score += Math.max(0, 50 - driver.distance * 5);
        }

        return { ...driver, finalScore: score };
      });

      scoredDrivers.sort((a, b) => b.finalScore - a.finalScore);

      const bestDriver = scoredDrivers[0];

      return {
        success: true,
        driverId: bestDriver.profile.user_id,
        driver: bestDriver,
        score: bestDriver.finalScore,
        alternatives: scoredDrivers.slice(1, 4)
      };
    } catch (error) {
      console.error('Failed to find best driver:', error);
      return {
        success: false,
        reason: 'error',
        alternatives: []
      };
    }
  }

  async assignOrderToDriver(
    orderId: string,
    driverId: string,
    assignedBy: string,
    timeoutMinutes: number = 5
  ): Promise<boolean> {
    try {
      await this.driverService.createOrderAssignment({
        orderId,
        driverId,
        assignedBy,
        timeoutMinutes
      });

      const supabase = (this.dataStore as any).supabase;
      await supabase
        .from('orders')
        .update({
          assigned_driver: driverId,
          status: 'confirmed',
          assigned_at: new Date().toISOString()
        })
        .eq('id', orderId);

      return true;
    } catch (error) {
      console.error('Failed to assign order to driver:', error);
      return false;
    }
  }

  async autoAssignOrder(
    order: Order,
    assignedBy: string,
    preferences?: AssignmentPreferences
  ): Promise<AssignmentResult> {
    const result = await this.findBestDriver(order, preferences);

    if (result.success && result.driverId) {
      const assigned = await this.assignOrderToDriver(
        order.id,
        result.driverId,
        assignedBy
      );

      if (!assigned) {
        return {
          success: false,
          reason: 'assignment_failed',
          alternatives: result.alternatives
        };
      }
    }

    return result;
  }

  async getWorkloadDistribution(): Promise<WorkloadDistribution[]> {
    try {
      const supabase = (this.dataStore as any).supabase;

      const { data: drivers, error: driversError } = await supabase
        .from('driver_profiles')
        .select('user_id, is_available, max_orders_capacity');

      if (driversError) throw driversError;

      const workload = await Promise.all(
        (drivers || []).map(async (driver: any) => {
          const stats = await this.driverService.getDriverStats(driver.user_id);
          const utilizationPercent = (stats.active_orders / driver.max_orders_capacity) * 100;

          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('telegram_id', driver.user_id)
            .maybeSingle();

          return {
            driverId: driver.user_id,
            driverName: userData?.name || driver.user_id,
            activeOrders: stats.active_orders,
            capacity: driver.max_orders_capacity,
            utilizationPercent,
            avgDeliveryTime: 35,
            isOverloaded: utilizationPercent > 80
          };
        })
      );

      return workload.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    } catch (error) {
      console.error('Failed to get workload distribution:', error);
      return [];
    }
  }

  async balanceWorkload(threshold: number = 80): Promise<{
    balanced: boolean;
    actions: string[];
  }> {
    const workload = await this.getWorkloadDistribution();

    const overloadedDrivers = workload.filter(d => d.utilizationPercent > threshold);
    const underutilizedDrivers = workload.filter(d => d.utilizationPercent < 50 && d.utilizationPercent > 0);

    const actions: string[] = [];

    if (overloadedDrivers.length === 0) {
      return { balanced: true, actions: ['כל הנהגים מאוזנים'] };
    }

    for (const overloaded of overloadedDrivers) {
      if (underutilizedDrivers.length > 0) {
        const target = underutilizedDrivers[0];
        actions.push(
          `העבר הזמנות מ-${overloaded.driverName} (${overloaded.utilizationPercent.toFixed(0)}%) ל-${target.driverName} (${target.utilizationPercent.toFixed(0)}%)`
        );
      } else {
        actions.push(
          `${overloaded.driverName} עמוס מדי (${overloaded.utilizationPercent.toFixed(0)}%) - יש להוסיף נהגים`
        );
      }
    }

    return {
      balanced: overloadedDrivers.length === 0,
      actions
    };
  }

  async getDriversInZones(zoneIds: string[]): Promise<string[]> {
    try {
      const assignments = await this.dataStore.listDriverZones?.({
        activeOnly: true
      });

      if (!assignments) return [];

      return assignments
        .filter(a => zoneIds.includes(a.zone_id))
        .map(a => a.driver_id);
    } catch (error) {
      console.error('Failed to get drivers in zones:', error);
      return [];
    }
  }

  async predictDriverAvailability(
    driverId: string,
    hoursAhead: number = 2
  ): Promise<{ available: boolean; confidence: number; reason?: string }> {
    try {
      const stats = await this.driverService.getDriverStats(driverId);
      const profile = await this.driverService.getDriverProfile(driverId);

      if (!profile || !profile.is_available) {
        return {
          available: false,
          confidence: 0.95,
          reason: 'נהג לא זמין כרגע'
        };
      }

      const avgDeliveryTime = 35;
      const timeUntilFree = stats.active_orders * avgDeliveryTime;
      const minutesAhead = hoursAhead * 60;

      if (timeUntilFree < minutesAhead) {
        return {
          available: true,
          confidence: 0.85,
          reason: `צפוי להיות פנוי בעוד ${Math.ceil(timeUntilFree)} דקות`
        };
      }

      return {
        available: false,
        confidence: 0.75,
        reason: `עסוק ב-${stats.active_orders} הזמנות`
      };
    } catch (error) {
      console.error('Failed to predict availability:', error);
      return {
        available: false,
        confidence: 0,
        reason: 'שגיאה בחיזוי'
      };
    }
  }

  async getOptimalAssignmentTime(orderId: string): Promise<{
    immediate: boolean;
    recommendedTime?: Date;
    reason: string;
  }> {
    try {
      const availableDrivers = await this.driverService.getAvailableDrivers({});

      if (availableDrivers.length === 0) {
        return {
          immediate: false,
          recommendedTime: new Date(Date.now() + 30 * 60 * 1000),
          reason: 'אין נהגים זמינים כרגע'
        };
      }

      const leastBusyDriver = availableDrivers.reduce((min, d) =>
        d.current_load < min.current_load ? d : min
      );

      if (leastBusyDriver.current_load === 0) {
        return {
          immediate: true,
          reason: 'נהג פנוי זמין מיידית'
        };
      }

      if (leastBusyDriver.current_load < leastBusyDriver.profile.max_orders_capacity) {
        return {
          immediate: true,
          reason: 'נהגים זמינים עם קיבולת פנויה'
        };
      }

      const avgDeliveryTime = 35;
      const waitTime = leastBusyDriver.current_load * avgDeliveryTime;

      return {
        immediate: false,
        recommendedTime: new Date(Date.now() + waitTime * 60 * 1000),
        reason: `מומלץ להמתין ${waitTime} דקות עד שנהג יתפנה`
      };
    } catch (error) {
      console.error('Failed to get optimal assignment time:', error);
      return {
        immediate: true,
        reason: 'לא ניתן לחשב זמן אופטימלי'
      };
    }
  }
}
