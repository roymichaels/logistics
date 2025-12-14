export interface Driver {
  id: string;
  userId: string;
  status: 'available' | 'busy' | 'offline';
  vehicleType?: string;
  vehicleId?: string;
  currentLocation?: Coordinates;
  rating?: number;
  totalDeliveries?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  pickupLocation: DeliveryLocation;
  deliveryLocation: DeliveryLocation;
  estimatedTime?: number;
  actualTime?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryLocation {
  address: string;
  coordinates: Coordinates;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

export interface Route {
  id: string;
  driverId: string;
  deliveries: string[];
  optimizedOrder: number[];
  totalDistance: number;
  estimatedDuration: number;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: number;
}
