export interface Zone {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  polygon?: GeoPolygon;
  delivery_fee: number;
  minimum_order?: number;
  estimated_delivery_time?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZoneAssignment {
  id: string;
  zone_id: string;
  driver_id: string;
  business_id: string;
  assigned_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoneCoverage {
  zone_id: string;
  zone_name: string;
  active_drivers: number;
  pending_orders: number;
  coverage_percentage: number;
}

export class ZoneEntity {
  constructor(private zone: Zone) {}

  get id(): string {
    return this.zone.id;
  }

  get name(): string {
    return this.zone.name;
  }

  get businessId(): string {
    return this.zone.business_id;
  }

  get deliveryFee(): number {
    return this.zone.delivery_fee;
  }

  get minimumOrder(): number {
    return this.zone.minimum_order || 0;
  }

  get isActive(): boolean {
    return this.zone.is_active;
  }

  get estimatedDeliveryTime(): number {
    return this.zone.estimated_delivery_time || 30;
  }

  hasPolygon(): boolean {
    return !!this.zone.polygon;
  }

  containsPoint(lat: number, lng: number): boolean {
    if (!this.zone.polygon) {
      return false;
    }

    const polygon = this.zone.polygon.coordinates[0];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect =
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  getPolygonCenter(): { lat: number; lng: number } | null {
    if (!this.zone.polygon) {
      return null;
    }

    const polygon = this.zone.polygon.coordinates[0];
    let latSum = 0;
    let lngSum = 0;

    polygon.forEach(coord => {
      latSum += coord[1];
      lngSum += coord[0];
    });

    return {
      lat: latSum / polygon.length,
      lng: lngSum / polygon.length,
    };
  }

  meetsMinimumOrder(orderTotal: number): boolean {
    if (!this.zone.minimum_order) {
      return true;
    }

    return orderTotal >= this.zone.minimum_order;
  }

  toJSON(): Zone {
    return { ...this.zone };
  }
}

export class ZoneAssignmentEntity {
  constructor(private assignment: ZoneAssignment) {}

  get id(): string {
    return this.assignment.id;
  }

  get zoneId(): string {
    return this.assignment.zone_id;
  }

  get driverId(): string {
    return this.assignment.driver_id;
  }

  get businessId(): string {
    return this.assignment.business_id;
  }

  get isActive(): boolean {
    return this.assignment.is_active;
  }

  get assignedAt(): string {
    return this.assignment.assigned_at;
  }

  canDeactivate(): boolean {
    return this.assignment.is_active;
  }

  canActivate(): boolean {
    return !this.assignment.is_active;
  }

  toJSON(): ZoneAssignment {
    return { ...this.assignment };
  }
}
