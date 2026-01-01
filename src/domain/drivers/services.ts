import { DriverEntity, DriverAssignmentEntity } from './entities';
import type { Driver, DriverAssignment, DriverPerformance, DriverLocation } from './entities';
import { logger } from '@/lib/logger';

export interface DriverAvailabilityScore {
  driver: Driver;
  score: number;
  distance: number | null;
  isInZone: boolean;
  statusWeight: number;
  locationWeight: number;
}

export class DriverDomainService {
  findNearestDriver(
    drivers: Driver[],
    targetLat: number,
    targetLng: number,
    maxDistance?: number
  ): Driver | null {
    const available = drivers.filter(d => {
      const entity = new DriverEntity(d);
      return entity.canAcceptOrders && entity.hasLocation();
    });

    if (available.length === 0) {
      return null;
    }

    let nearest: { driver: Driver; distance: number } | null = null;

    available.forEach(driver => {
      const entity = new DriverEntity(driver);
      const distance = entity.distanceFromPoint(targetLat, targetLng);

      if (distance === null) return;

      if (maxDistance && distance > maxDistance) return;

      if (!nearest || distance < nearest.distance) {
        nearest = { driver, distance };
      }
    });

    return nearest?.driver || null;
  }

  calculateAvailabilityScore(
    driver: Driver,
    targetLat: number,
    targetLng: number,
    zoneIds?: string[]
  ): DriverAvailabilityScore {
    const entity = new DriverEntity(driver);

    let statusWeight = 0;
    if (entity.isAvailable) statusWeight = 100;
    else if (entity.isOnBreak) statusWeight = 25;
    else statusWeight = 0;

    const distance = entity.distanceFromPoint(targetLat, targetLng);
    const maxDistance = 50;
    const locationWeight = distance !== null
      ? Math.max(0, 100 - (distance / maxDistance) * 100)
      : 0;

    const isInZone = false;

    const score = statusWeight * 0.5 + locationWeight * 0.3 + (isInZone ? 20 : 0);

    return {
      driver,
      score,
      distance,
      isInZone,
      statusWeight,
      locationWeight,
    };
  }

  rankDriversByAvailability(
    drivers: Driver[],
    targetLat: number,
    targetLng: number,
    zoneIds?: string[]
  ): DriverAvailabilityScore[] {
    const scores = drivers.map(driver =>
      this.calculateAvailabilityScore(driver, targetLat, targetLng, zoneIds)
    );

    return scores.sort((a, b) => b.score - a.score);
  }

  calculatePerformance(assignments: DriverAssignment[]): DriverPerformance | null {
    if (assignments.length === 0) {
      return null;
    }

    const driverId = assignments[0].driver_id;
    const completed = assignments.filter(a => {
      const entity = new DriverAssignmentEntity(a);
      return entity.isCompleted;
    });

    const cancelled = assignments.filter(a => {
      const entity = new DriverAssignmentEntity(a);
      return entity.isCancelled;
    });

    const durations = completed
      .map(a => {
        const entity = new DriverAssignmentEntity(a);
        return entity.getDuration();
      })
      .filter((d): d is number => d !== null);

    const averageDeliveryTime =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    const periods = assignments.map(a => new Date(a.created_at).getTime());
    const periodStart = new Date(Math.min(...periods)).toISOString();
    const periodEnd = new Date(Math.max(...periods)).toISOString();

    return {
      driver_id: driverId,
      period_start: periodStart,
      period_end: periodEnd,
      total_deliveries: assignments.length,
      completed_deliveries: completed.length,
      cancelled_deliveries: cancelled.length,
      average_rating: 0,
      total_earnings: 0,
      average_delivery_time: averageDeliveryTime,
    };
  }

  isDriverAvailableForZone(driver: Driver, zoneId: string, zoneAssignments: string[]): boolean {
    const entity = new DriverEntity(driver);

    if (!entity.canAcceptOrders) {
      return false;
    }

    return zoneAssignments.includes(zoneId);
  }

  validateDriverLocation(location: DriverLocation): { valid: boolean; reason?: string } {
    if (location.lat < -90 || location.lat > 90) {
      return { valid: false, reason: 'Invalid latitude' };
    }

    if (location.lng < -180 || location.lng > 180) {
      return { valid: false, reason: 'Invalid longitude' };
    }

    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    if (location.timestamp < fiveMinutesAgo) {
      return { valid: false, reason: 'Location data is too old' };
    }

    return { valid: true };
  }

  predictETA(
    driverLocation: { lat: number; lng: number },
    destinationLocation: { lat: number; lng: number },
    averageSpeed: number = 40
  ): number {
    const entity = new DriverEntity({
      id: 'temp',
      user_id: 'temp',
      business_id: 'temp',
      status: 'available',
      current_location: driverLocation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const distance = entity.distanceFromPoint(destinationLocation.lat, destinationLocation.lng);

    if (distance === null) {
      logger.warn('[DriverDomainService] Could not calculate distance for ETA');
      return 0;
    }

    const hours = distance / averageSpeed;
    const minutes = hours * 60;

    return Math.ceil(minutes);
  }

  groupDriversByStatus(drivers: Driver[]): {
    available: Driver[];
    busy: Driver[];
    offline: Driver[];
    onBreak: Driver[];
  } {
    const groups = {
      available: [] as Driver[],
      busy: [] as Driver[],
      offline: [] as Driver[],
      onBreak: [] as Driver[],
    };

    drivers.forEach(driver => {
      const entity = new DriverEntity(driver);

      if (entity.isAvailable) groups.available.push(driver);
      else if (entity.isBusy) groups.busy.push(driver);
      else if (entity.isOnBreak) groups.onBreak.push(driver);
      else if (entity.isOffline) groups.offline.push(driver);
    });

    return groups;
  }
}
