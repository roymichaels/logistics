import { logger } from '../../../lib/logger';
import {
  Driver,
  DriverAssignment,
  DriverLocation,
  DriverPerformance,
  DriverEarnings,
  DriverEarningsSummary,
  DriverStats,
  DriverInventoryItem,
  DriverMovement,
  AvailableDriver,
  DriverFilters,
  DriverFormData,
  DriverUpdateData,
  DriverLocationUpdate,
  DriverApplication,
  DriverEfficiency,
  DriverRatingEntry,
  DriverStatus
} from '../types';

export class DriverService {
  private readonly storeName = 'drivers';
  private readonly assignmentsStore = 'driver_assignments';
  private readonly locationsStore = 'driver_locations';
  private readonly earningsStore = 'driver_earnings';
  private readonly inventoryStore = 'driver_inventory';
  private readonly movementsStore = 'driver_movements';
  private readonly applicationsStore = 'driver_applications';

  constructor(private db: IDBDatabase) {}

  async getAllDrivers(filters?: DriverFilters): Promise<Driver[]> {
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      const drivers = await new Promise<Driver[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      let filtered = drivers;

      if (filters?.status) {
        filtered = filtered.filter(d => d.status === filters.status);
      }

      if (filters?.is_available !== undefined) {
        filtered = filtered.filter(d => d.is_available === filters.is_available);
      }

      if (filters?.business_id) {
        filtered = filtered.filter(d => d.business_id === filters.business_id);
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(d =>
          d.user_id.toLowerCase().includes(search) ||
          d.phone?.toLowerCase().includes(search) ||
          d.vehicle_plate?.toLowerCase().includes(search)
        );
      }

      return filtered;
    } catch (error) {
      logger.error('Failed to get drivers:', error);
      return [];
    }
  }

  async getDriverById(id: string): Promise<Driver | null> {
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logger.error('Failed to get driver:', error);
      return null;
    }
  }

  async getDriverByUserId(userId: string): Promise<Driver | null> {
    try {
      const drivers = await this.getAllDrivers();
      return drivers.find(d => d.user_id === userId) || null;
    } catch (error) {
      logger.error('Failed to get driver by user ID:', error);
      return null;
    }
  }

  async createDriver(data: DriverFormData): Promise<Driver> {
    try {
      const driver: Driver = {
        id: `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'offline',
        is_available: false,
        max_orders_capacity: data.max_orders_capacity || 5,
        rating: 5.0,
        total_deliveries: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.add(driver);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      logger.info('Driver created:', driver.id);
      return driver;
    } catch (error) {
      logger.error('Failed to create driver:', error);
      throw error;
    }
  }

  async updateDriver(id: string, data: DriverUpdateData): Promise<void> {
    try {
      const driver = await this.getDriverById(id);
      if (!driver) {
        throw new Error('Driver not found');
      }

      const updated: Driver = {
        ...driver,
        ...data,
        updated_at: new Date().toISOString()
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(updated);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      logger.info('Driver updated:', id);
    } catch (error) {
      logger.error('Failed to update driver:', error);
      throw error;
    }
  }

  async deleteDriver(id: string): Promise<void> {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(id);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      logger.info('Driver deleted:', id);
    } catch (error) {
      logger.error('Failed to delete driver:', error);
      throw error;
    }
  }

  async updateDriverStatus(driverId: string, status: DriverStatus): Promise<void> {
    try {
      const driver = await this.getDriverById(driverId);
      if (!driver) throw new Error('Driver not found');

      await this.updateDriver(driverId, { status });
    } catch (error) {
      logger.error('Failed to update driver status:', error);
      throw error;
    }
  }

  async updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<void> {
    try {
      const driver = await this.getDriverById(driverId);
      if (!driver) throw new Error('Driver not found');

      await this.updateDriver(driverId, {
        is_available: isAvailable,
        status: isAvailable ? 'available' : 'offline'
      });
    } catch (error) {
      logger.error('Failed to update driver availability:', error);
      throw error;
    }
  }

  async updateDriverLocation(data: DriverLocationUpdate): Promise<void> {
    try {
      const location: DriverLocation = {
        id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        recorded_at: new Date().toISOString()
      };

      const transaction = this.db.transaction([this.locationsStore], 'readwrite');
      const store = transaction.objectStore(this.locationsStore);
      store.add(location);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      await this.updateDriver(data.driver_id, {
        current_location: {
          lat: data.lat,
          lng: data.lng
        }
      });

      logger.info('Driver location updated:', data.driver_id);
    } catch (error) {
      logger.error('Failed to update driver location:', error);
      throw error;
    }
  }

  async getDriverStats(driverId: string): Promise<DriverStats> {
    try {
      const driver = await this.getDriverById(driverId);

      return {
        total_deliveries: driver?.total_deliveries || 0,
        successful_deliveries: driver?.total_deliveries || 0,
        rating: driver?.rating || 5.0,
        success_rate: 100,
        active_orders: 0,
        completed_today: 0,
        revenue_today: 0
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
      const drivers = await this.getAllDrivers({ is_available: true });

      const driversWithDetails: AvailableDriver[] = drivers.map(driver => {
        let distance: number | undefined;
        let estimatedTime: number | undefined;

        if (
          params?.latitude &&
          params?.longitude &&
          driver.current_location
        ) {
          distance = this.calculateDistance(
            params.latitude,
            params.longitude,
            driver.current_location.lat,
            driver.current_location.lng
          );

          estimatedTime = Math.ceil((distance / 40) * 60);
        }

        if (params?.maxDistance && distance && distance > params.maxDistance) {
          return null;
        }

        const currentLoad = 0;
        const score =
          (driver.rating || 5.0) * 20 +
          (100 - (currentLoad / driver.max_orders_capacity) * 100) +
          (distance ? Math.max(0, 100 - distance * 2) : 50);

        return {
          driver,
          distance,
          current_load: currentLoad,
          score,
          estimated_time: estimatedTime
        };
      }).filter((d): d is AvailableDriver => d !== null);

      return driversWithDetails.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to get available drivers:', error);
      return [];
    }
  }

  async getDriverEarnings(driverId: string, startDate?: Date, endDate?: Date): Promise<DriverEarningsSummary> {
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
      logger.error('Failed to get driver earnings:', error);
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

  async getDriverPerformance(driverId: string, periodStart: string, periodEnd: string): Promise<DriverPerformance> {
    try {
      const driver = await this.getDriverById(driverId);
      const stats = await this.getDriverStats(driverId);

      return {
        driver_id: driverId,
        period_start: periodStart,
        period_end: periodEnd,
        total_deliveries: driver?.total_deliveries || 0,
        completed_deliveries: driver?.total_deliveries || 0,
        cancelled_deliveries: 0,
        average_rating: driver?.rating || 5.0,
        total_earnings: stats.revenue_today,
        average_delivery_time: 35,
        on_time_delivery_rate: stats.success_rate,
        customer_satisfaction: driver?.rating || 5.0,
        completion_rate: stats.success_rate
      };
    } catch (error) {
      logger.error('Failed to get driver performance:', error);
      throw error;
    }
  }

  async getDriverEfficiency(driverId: string): Promise<DriverEfficiency> {
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
}
