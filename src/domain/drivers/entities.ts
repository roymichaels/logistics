export interface Driver {
  id: string;
  user_id: string;
  business_id: string;
  status: 'available' | 'busy' | 'offline' | 'on_break';
  current_location?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  vehicle_type?: string;
  license_number?: string;
  rating?: number;
  total_deliveries?: number;
  created_at: string;
  updated_at: string;
}

export interface DriverAssignment {
  id: string;
  driver_id: string;
  order_id: string;
  zone_id?: string;
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  driver_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface DriverPerformance {
  driver_id: string;
  period_start: string;
  period_end: string;
  total_deliveries: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  average_rating: number;
  total_earnings: number;
  average_delivery_time: number;
}

export interface DriverEarnings {
  id: string;
  driver_id: string;
  order_id: string;
  base_amount: number;
  tip_amount: number;
  bonus_amount: number;
  total_amount: number;
  paid: boolean;
  paid_at?: string;
  created_at: string;
}

export class DriverEntity {
  constructor(private driver: Driver) {}

  get id(): string {
    return this.driver.id;
  }

  get userId(): string {
    return this.driver.user_id;
  }

  get businessId(): string {
    return this.driver.business_id;
  }

  get status(): string {
    return this.driver.status;
  }

  get isAvailable(): boolean {
    return this.driver.status === 'available';
  }

  get isBusy(): boolean {
    return this.driver.status === 'busy';
  }

  get isOffline(): boolean {
    return this.driver.status === 'offline';
  }

  get isOnBreak(): boolean {
    return this.driver.status === 'on_break';
  }

  get canAcceptOrders(): boolean {
    return this.isAvailable;
  }

  get rating(): number {
    return this.driver.rating || 0;
  }

  get totalDeliveries(): number {
    return this.driver.total_deliveries || 0;
  }

  hasLocation(): boolean {
    return !!this.driver.current_location;
  }

  distanceFromPoint(lat: number, lng: number): number | null {
    if (!this.driver.current_location) {
      return null;
    }

    const R = 6371;
    const dLat = this.toRad(lat - this.driver.current_location.lat);
    const dLng = this.toRad(lng - this.driver.current_location.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(this.driver.current_location.lat)) *
        Math.cos(this.toRad(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  toJSON(): Driver {
    return { ...this.driver };
  }
}

export class DriverAssignmentEntity {
  constructor(private assignment: DriverAssignment) {}

  get id(): string {
    return this.assignment.id;
  }

  get driverId(): string {
    return this.assignment.driver_id;
  }

  get orderId(): string {
    return this.assignment.order_id;
  }

  get status(): string {
    return this.assignment.status;
  }

  get isAssigned(): boolean {
    return this.assignment.status === 'assigned';
  }

  get isAccepted(): boolean {
    return this.assignment.status === 'accepted';
  }

  get isInProgress(): boolean {
    return this.assignment.status === 'in_progress';
  }

  get isCompleted(): boolean {
    return this.assignment.status === 'completed';
  }

  get isCancelled(): boolean {
    return this.assignment.status === 'cancelled';
  }

  canAccept(): boolean {
    return this.isAssigned;
  }

  canStart(): boolean {
    return this.isAccepted;
  }

  canComplete(): boolean {
    return this.isInProgress;
  }

  canCancel(): boolean {
    return this.isAssigned || this.isAccepted;
  }

  getDuration(): number | null {
    if (!this.assignment.started_at || !this.assignment.completed_at) {
      return null;
    }

    const start = new Date(this.assignment.started_at).getTime();
    const end = new Date(this.assignment.completed_at).getTime();

    return end - start;
  }

  toJSON(): DriverAssignment {
    return { ...this.assignment };
  }
}
