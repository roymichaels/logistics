import { ZoneEntity, ZoneAssignmentEntity } from './entities';
import type { Zone, ZoneAssignment, ZoneCoverage } from './entities';
import { logger } from '@/lib/logger';

export interface ZoneRecommendation {
  zone: Zone;
  confidence: number;
  reason: string;
}

export class ZoneDomainService {
  findZoneForLocation(zones: Zone[], lat: number, lng: number): Zone | null {
    const activeZones = zones.filter(z => {
      const entity = new ZoneEntity(z);
      return entity.isActive;
    });

    for (const zone of activeZones) {
      const entity = new ZoneEntity(zone);

      if (entity.containsPoint(lat, lng)) {
        return zone;
      }
    }

    return null;
  }

  findNearestZone(zones: Zone[], lat: number, lng: number): Zone | null {
    const activeZones = zones.filter(z => {
      const entity = new ZoneEntity(z);
      return entity.isActive && entity.hasPolygon();
    });

    if (activeZones.length === 0) {
      return null;
    }

    let nearestZone: { zone: Zone; distance: number } | null = null;

    activeZones.forEach(zone => {
      const entity = new ZoneEntity(zone);
      const center = entity.getPolygonCenter();

      if (!center) return;

      const distance = this.calculateDistance(lat, lng, center.lat, center.lng);

      if (!nearestZone || distance < nearestZone.distance) {
        nearestZone = { zone, distance };
      }
    });

    return nearestZone?.zone || null;
  }

  recommendZone(
    zones: Zone[],
    lat: number,
    lng: number,
    orderTotal: number
  ): ZoneRecommendation | null {
    const containingZone = this.findZoneForLocation(zones, lat, lng);

    if (containingZone) {
      const entity = new ZoneEntity(containingZone);

      if (!entity.meetsMinimumOrder(orderTotal)) {
        return {
          zone: containingZone,
          confidence: 0.5,
          reason: `Order total below minimum (${entity.minimumOrder})`,
        };
      }

      return {
        zone: containingZone,
        confidence: 1.0,
        reason: 'Location is within zone boundaries',
      };
    }

    const nearestZone = this.findNearestZone(zones, lat, lng);

    if (nearestZone) {
      return {
        zone: nearestZone,
        confidence: 0.6,
        reason: 'Nearest available zone',
      };
    }

    return null;
  }

  validateZonePolygon(polygon: any): { valid: boolean; reason?: string } {
    if (!polygon || !polygon.coordinates) {
      return { valid: false, reason: 'Polygon must have coordinates' };
    }

    if (polygon.type !== 'Polygon') {
      return { valid: false, reason: 'Geometry type must be Polygon' };
    }

    const coords = polygon.coordinates[0];

    if (!Array.isArray(coords) || coords.length < 3) {
      return { valid: false, reason: 'Polygon must have at least 3 points' };
    }

    for (const coord of coords) {
      if (!Array.isArray(coord) || coord.length < 2) {
        return { valid: false, reason: 'Invalid coordinate format' };
      }

      const [lng, lat] = coord;

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { valid: false, reason: 'Coordinate values out of range' };
      }
    }

    return { valid: true };
  }

  calculateZoneCoverage(
    zone: Zone,
    assignments: ZoneAssignment[],
    pendingOrderCount: number
  ): ZoneCoverage {
    const activeDrivers = assignments.filter(a => {
      const entity = new ZoneAssignmentEntity(a);
      return entity.isActive && entity.zoneId === zone.id;
    }).length;

    const optimalDriverCount = Math.ceil(pendingOrderCount / 5);
    const coveragePercentage = optimalDriverCount > 0
      ? Math.min(100, (activeDrivers / optimalDriverCount) * 100)
      : 100;

    return {
      zone_id: zone.id,
      zone_name: zone.name,
      active_drivers: activeDrivers,
      pending_orders: pendingOrderCount,
      coverage_percentage: coveragePercentage,
    };
  }

  groupZonesByBusiness(zones: Zone[]): Map<string, Zone[]> {
    const map = new Map<string, Zone[]>();

    zones.forEach(zone => {
      const existing = map.get(zone.business_id) || [];
      existing.push(zone);
      map.set(zone.business_id, existing);
    });

    return map;
  }

  findDriversInZone(
    zoneId: string,
    assignments: ZoneAssignment[]
  ): string[] {
    return assignments
      .filter(a => {
        const entity = new ZoneAssignmentEntity(a);
        return entity.isActive && entity.zoneId === zoneId;
      })
      .map(a => a.driver_id);
  }

  validateDeliveryFee(fee: number): { valid: boolean; reason?: string } {
    if (fee < 0) {
      return { valid: false, reason: 'Delivery fee cannot be negative' };
    }

    if (fee > 1000) {
      return { valid: false, reason: 'Delivery fee seems unreasonably high' };
    }

    return { valid: true };
  }

  calculateOptimalDeliveryFee(
    distance: number,
    baseRate: number = 5,
    perKmRate: number = 2
  ): number {
    return baseRate + distance * perKmRate;
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
