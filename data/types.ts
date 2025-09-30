export interface User {
  telegram_id: string;
  role: 'user' | 'manager' | 'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service';
  name?: string;
  username?: string;
  photo_url?: string;
  department?: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  category: string;
  description?: string;
  image_url?: string;
  warehouse_location?: string;
  created_at: string;
  updated_at: string;
  inventory_balances?: InventoryRecord[];
  driver_balances?: DriverInventoryRecord[];
}

export type InventoryLocationType =
  | 'central'
  | 'warehouse'
  | 'hub'
  | 'vehicle'
  | 'storefront';

export interface InventoryLocation {
  id: string;
  code: string;
  name: string;
  type: InventoryLocationType;
  description?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  contact_phone?: string | null;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  location?: InventoryLocation;
  product?: Product;
}

export interface DriverInventoryRecord {
  id: string;
  product_id: string;
  driver_id: string;
  quantity: number;
  updated_at: string;
  location_id?: string | null;
  location?: InventoryLocation;
  product?: Product;
}

export interface Zone {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverZoneAssignment {
  id: string;
  driver_id: string;
  zone_id: string;
  active: boolean;
  assigned_at: string;
  unassigned_at?: string | null;
  assigned_by?: string | null;
  zone?: Zone;
}

export type DriverAvailabilityStatus = 'available' | 'on_break' | 'delivering' | 'off_shift';

export interface DriverStatusRecord {
  driver_id: string;
  status: DriverAvailabilityStatus;
  is_online: boolean;
  current_zone_id?: string | null;
  last_updated: string;
  note?: string | null;
  zone?: Zone;
}

export type DriverMovementAction =
  | 'zone_joined'
  | 'zone_left'
  | 'status_changed'
  | 'inventory_added'
  | 'inventory_removed'
  | 'order_assigned';

export interface DriverMovementLog {
  id: string;
  driver_id: string;
  zone_id?: string | null;
  product_id?: string | null;
  quantity_change?: number | null;
  action: DriverMovementAction;
  details?: string | null;
  created_at: string;
  zone?: Zone;
  product?: Product;
}

export type RestockRequestStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';

export interface RestockRequest {
  id: string;
  product_id: string;
  requested_by: string;
  requested_quantity: number;
  status: RestockRequestStatus;
  from_location_id?: string | null;
  to_location_id: string;
  approved_by?: string | null;
  approved_quantity?: number | null;
  fulfilled_by?: string | null;
  fulfilled_quantity?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  from_location?: InventoryLocation | null;
  to_location?: InventoryLocation | null;
  product?: Product;
}

export type InventoryLogType = 'restock' | 'transfer' | 'adjustment' | 'reservation' | 'release' | 'sale';

export interface InventoryLog {
  id: string;
  product_id: string;
  change_type: InventoryLogType;
  quantity_change: number;
  from_location_id?: string | null;
  to_location_id?: string | null;
  from_location?: InventoryLocation | null;
  to_location?: InventoryLocation | null;
  reference_id?: string | null;
  created_by: string;
  created_at: string;
  metadata?: Record<string, any> | null;
  product?: Product;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  triggered_at: string;
}

export interface RolePermissions {
  role: User['role'];
  can_view_inventory: boolean;
  can_request_restock: boolean;
  can_approve_restock: boolean;
  can_fulfill_restock: boolean;
  can_transfer_inventory: boolean;
  can_adjust_inventory: boolean;
  can_view_movements: boolean;
  can_manage_locations: boolean;
  can_view_sales: boolean;
}

export interface SalesLog {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  total_amount: number;
  reference_id?: string | null;
  recorded_by: string;
  sold_at: string;
  notes?: string | null;
  product?: Product;
  location?: InventoryLocation;
}

export type OrderEntryMode = 'dm' | 'storefront';

export interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  source_location?: string | null;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: OrderItemInput[];
  total_amount: number;
  notes?: string;
  delivery_date?: string;
  assigned_driver?: string;
  created_by: string;
  salesperson_id?: string;
  entry_mode?: OrderEntryMode;
  raw_order_text?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: OrderItemInput[];
  notes?: string;
  delivery_date?: string;
  salesperson_id?: string;
  entry_mode: OrderEntryMode;
  raw_order_text?: string;
  status?: Order['status'];
  total_amount?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'warehouse' | 'sales' | 'customer_service' | 'general';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  order_id?: string;
  proof_url?: string;
  location?: string;
  completed_at?: string;
  created_at: string;
}

export interface GroupChat {
  id: string;
  name: string;
  type: 'department' | 'project' | 'general';
  department?: string;
  members: string[];
  telegram_chat_id?: string;
  description?: string;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'announcements' | 'updates' | 'alerts';
  telegram_channel_id?: string;
  description?: string;
  subscribers: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  recipient_id: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface Route {
  id: string;
  driver_id: string;
  date: string;
  orders: string[];
  status: 'planned' | 'active' | 'completed';
  estimated_duration?: number;
  actual_duration?: number;
  created_at: string;
}

export interface DataStore {
  // Auth & Profile
  getProfile(): Promise<User>;
  updateProfile?(updates: Partial<User>): Promise<void>;
  
  // Products
  listProducts?(filters?: { category?: string; q?: string }): Promise<Product[]>;
  getProduct?(id: string): Promise<Product>;
  createProduct?(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }>;
  updateProduct?(id: string, updates: Partial<Product>): Promise<void>;

  // Inventory
  listInventory?(filters?: { product_id?: string; location_id?: string; location_ids?: string[] }): Promise<InventoryRecord[]>;
  getInventory?(productId: string, locationId?: string): Promise<InventoryRecord | null>;
  listInventoryLocations?(): Promise<InventoryLocation[]>;
  listDriverInventory?(filters?: { driver_id?: string; product_id?: string; driver_ids?: string[] }): Promise<DriverInventoryRecord[]>;
  listRestockRequests?(filters?: {
    status?: RestockRequestStatus | 'all';
    onlyMine?: boolean;
    product_id?: string;
    location_id?: string;
  }): Promise<RestockRequest[]>;
  submitRestockRequest?(input: {
    product_id: string;
    requested_quantity: number;
    to_location_id: string;
    from_location_id?: string | null;
    notes?: string;
  }): Promise<{ id: string }>;
  approveRestockRequest?(id: string, input: { approved_quantity: number; from_location_id: string; notes?: string }): Promise<void>;
  fulfillRestockRequest?(id: string, input: { fulfilled_quantity: number; notes?: string; reference_id?: string | null }): Promise<void>;
  rejectRestockRequest?(id: string, input?: { notes?: string }): Promise<void>;
  transferInventory?(input: {
    product_id: string;
    from_location_id: string;
    to_location_id: string;
    quantity: number;
    notes?: string;
    reference_id?: string | null;
  }): Promise<void>;
  transferInventoryToDriver?(input: { product_id: string; driver_id: string; quantity: number; notes?: string }): Promise<void>;
  adjustDriverInventory?(input: {
    driver_id: string;
    product_id: string;
    quantity_change: number;
    reason: string;
    notes?: string;
    zone_id?: string | null;
  }): Promise<void>;
  listInventoryLogs?(filters?: {
    product_id?: string;
    location_id?: string;
    limit?: number;
  }): Promise<InventoryLog[]>;
  listSalesLogs?(filters?: { product_id?: string; location_id?: string; limit?: number }): Promise<SalesLog[]>;
  getLowStockAlerts?(filters?: { location_id?: string }): Promise<InventoryAlert[]>;
  getRolePermissions?(): Promise<RolePermissions>;

  // Zones & Dispatch
  listZones?(): Promise<Zone[]>;
  getZone?(id: string): Promise<Zone | null>;
  listDriverZones?(filters?: { driver_id?: string; zone_id?: string; activeOnly?: boolean }): Promise<DriverZoneAssignment[]>;
  assignDriverToZone?(input: { zone_id: string; driver_id?: string; active?: boolean }): Promise<void>;
  updateDriverStatus?(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void>;
  getDriverStatus?(driver_id?: string): Promise<DriverStatusRecord | null>;
  listDriverStatuses?(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]>;
  logDriverMovement?(input: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string;
  }): Promise<void>;
  listDriverMovements?(filters?: { driver_id?: string; zone_id?: string; limit?: number }): Promise<DriverMovementLog[]>;

  // Orders
  listOrders?(filters?: { status?: string; q?: string }): Promise<Order[]>;
  getOrder?(id: string): Promise<Order>;
  createOrder?(input: CreateOrderInput): Promise<{ id: string }>;
  updateOrder?(id: string, updates: Partial<Order>): Promise<void>;
  
  // Tasks
  listMyTasks?(): Promise<Task[]>;
  listAllTasks?(): Promise<Task[]>;
  createTask?(input: Omit<Task, 'id' | 'created_at'>): Promise<{ id: string }>;
  updateTask?(id: string, updates: Partial<Task>): Promise<void>;
  completeTask?(id: string, proof?: { photo?: string; location?: string; notes?: string }): Promise<void>;
  
  // Routes
  getMyRoute?(date: string): Promise<Route | null>;
  createRoute?(input: Omit<Route, 'id' | 'created_at'>): Promise<{ id: string }>;
  
  // Communications
  listGroupChats?(): Promise<GroupChat[]>;
  listChannels?(): Promise<Channel[]>;
  
  // Notifications
  getNotifications?(): Promise<Notification[]>;
  markNotificationRead?(id: string): Promise<void>;
}

export interface BootstrapConfig {
  app: string;
  adapters: {
    data: 'postgres' | 'sqlite' | 'mock';
  };
  features: {
    offline_mode?: boolean;
    photo_upload?: boolean;
    gps_tracking?: boolean;
    group_chats?: boolean;
    notifications?: boolean;
  };
  ui: {
    brand: string;
    accent: string;
    theme?: 'light' | 'dark' | 'auto';
    language: 'he' | 'en';
  };
  defaults: {
    mode: 'real';
  };
}

export interface UserPreference {
  telegram_id: string;
  app: string;
  mode: 'real';
  updated_at: string;
}

export interface AppConfig {
  app: string;
  config: BootstrapConfig;
  updated_at: string;
}