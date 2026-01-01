export type DriverStatus = 'available' | 'busy' | 'offline' | 'on_break';

export type DriverAssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export type DriverMovementAction =
  | 'zone_entry'
  | 'zone_exit'
  | 'inventory_added'
  | 'inventory_removed'
  | 'break_start'
  | 'break_end'
  | 'shift_start'
  | 'shift_end';

export interface Driver {
  id: string;
  user_id: string;
  business_id: string;
  status: DriverStatus;
  current_location?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  license_number?: string;
  rating?: number;
  total_deliveries?: number;
  is_available: boolean;
  max_orders_capacity: number;
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
  status: DriverAssignmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverLocation {
  id?: string;
  driver_id: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  recorded_at?: string;
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
  on_time_delivery_rate: number;
  customer_satisfaction: number;
  completion_rate: number;
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

export interface DriverEarningsSummary {
  totalEarnings: number;
  baseEarnings: number;
  tips: number;
  bonuses: number;
  deliveryCount: number;
  avgEarningsPerDelivery: number;
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

export interface DriverInventoryItem {
  id: string;
  driver_id: string;
  product_id: string;
  quantity: number;
  location_id?: string;
  updated_at: string;
}

export interface DriverMovement {
  id: string;
  driver_id: string;
  zone_id?: string;
  product_id?: string;
  quantity_change?: number;
  action: DriverMovementAction;
  details?: string;
  created_at: string;
}

export interface AvailableDriver {
  driver: Driver;
  distance?: number;
  current_load: number;
  score: number;
  estimated_time?: number;
}

export interface DriverFilters {
  status?: DriverStatus;
  zone_id?: string;
  is_available?: boolean;
  search?: string;
  business_id?: string;
}

export interface DriverFormData {
  user_id: string;
  business_id: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  license_number?: string;
  max_orders_capacity?: number;
}

export interface DriverUpdateData {
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  license_number?: string;
  status?: DriverStatus;
  is_available?: boolean;
  current_location?: {
    lat: number;
    lng: number;
  };
}

export interface DriverLocationUpdate {
  driver_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface DriverApplication {
  id: string;
  user_id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  vehicle_plate: string;
  license_number: string;
  license_expiry?: string;
  insurance_expiry?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface DriverEfficiency {
  deliveriesPerHour: number;
  utilizationRate: number;
  avgDistancePerDelivery: number;
  fuelEfficiencyScore: number;
}

export interface DriverRatingEntry {
  date: string;
  rating: number;
  orderId: string;
  comment?: string;
}
