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
  inventory_snapshot?: InventoryRecord;
  driver_balances?: DriverInventoryRecord[];
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  central_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  product?: Product;
}

export interface DriverInventoryRecord {
  id: string;
  product_id: string;
  driver_id: string;
  quantity: number;
  updated_at: string;
  product?: Product;
}

export type RestockRequestStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';

export interface RestockRequest {
  id: string;
  product_id: string;
  requested_by: string;
  requested_quantity: number;
  status: RestockRequestStatus;
  approved_by?: string | null;
  approved_quantity?: number | null;
  fulfilled_by?: string | null;
  fulfilled_quantity?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export type InventoryLogType = 'restock' | 'transfer' | 'adjustment' | 'reservation' | 'release';

export interface InventoryLog {
  id: string;
  product_id: string;
  change_type: InventoryLogType;
  quantity_change: number;
  from_location?: string | null;
  to_location?: string | null;
  reference_id?: string | null;
  created_by: string;
  created_at: string;
  metadata?: Record<string, any> | null;
  product?: Product;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  central_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
}

export interface RolePermissions {
  role: User['role'];
  can_view_inventory: boolean;
  can_request_restock: boolean;
  can_approve_restock: boolean;
  can_fulfill_restock: boolean;
  can_transfer_inventory: boolean;
  can_adjust_inventory: boolean;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
  notes?: string;
  delivery_date?: string;
  assigned_driver?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  listInventory?(filters?: { product_id?: string }): Promise<InventoryRecord[]>;
  getInventory?(productId: string): Promise<InventoryRecord | null>;
  listDriverInventory?(filters?: { driver_id?: string; product_id?: string }): Promise<DriverInventoryRecord[]>;
  listRestockRequests?(filters?: { status?: RestockRequestStatus | 'all'; onlyMine?: boolean }): Promise<RestockRequest[]>;
  submitRestockRequest?(input: { product_id: string; requested_quantity: number; notes?: string }): Promise<{ id: string }>;
  approveRestockRequest?(id: string, input: { approved_quantity: number; notes?: string }): Promise<void>;
  fulfillRestockRequest?(id: string, input: { fulfilled_quantity: number; notes?: string }): Promise<void>;
  rejectRestockRequest?(id: string, input?: { notes?: string }): Promise<void>;
  transferInventoryToDriver?(input: { product_id: string; driver_id: string; quantity: number; notes?: string }): Promise<void>;
  listInventoryLogs?(filters?: { product_id?: string; limit?: number }): Promise<InventoryLog[]>;
  getLowStockAlerts?(): Promise<InventoryAlert[]>;
  getRolePermissions?(): Promise<RolePermissions>;
  
  // Orders
  listOrders?(filters?: { status?: string; q?: string }): Promise<Order[]>;
  getOrder?(id: string): Promise<Order>;
  createOrder?(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }>;
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