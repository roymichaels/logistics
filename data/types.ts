export interface User {
  telegram_id: string;
  role: 'manager' | 'worker';
  name?: string;
  username?: string;
  photo_url?: string;
}

export interface Order {
  id: string;
  created_by: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  item_name: string;
  location: string;
  due_date?: string;
  notes?: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  order_id: string;
  worker_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  location?: string;
  proof_url?: string;
  completed_at?: string;
  created_at: string;
}

export interface Route {
  id: string;
  worker_id: string;
  date: string;
  stops: Array<{
    order_id: string;
    location: string;
    sequence: number;
    status: string;
  }>;
}

export interface DataStore {
  // Auth
  getProfile(): Promise<User>;
  updateProfile?(updates: Partial<User>): Promise<void>;
  
  // Orders (manager)
  listOrders?(filters?: { status?: string; q?: string }): Promise<Order[]>;
  getOrder?(id: string): Promise<Order>;
  createOrder?(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }>;
  updateOrder?(id: string, updates: Partial<Order>): Promise<void>;
  
  // Tasks (worker)
  listMyTasks?(): Promise<Task[]>;
  completeTask?(id: string, proof?: { photo?: string; qr?: string; location?: string }): Promise<void>;
  
  // Routes
  getMyRoute?(date: string): Promise<Route | null>;
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
    route_optimization?: boolean;
  };
  ui: {
    brand: string;
    accent: string;
    theme?: 'light' | 'dark' | 'auto';
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