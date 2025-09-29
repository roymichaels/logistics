import { DataStore, User, Order, Task, Route, BootstrapConfig } from '../../data/types';

// Browser-compatible mock data store
const createMockUser = (providedUser?: any): User => ({
  telegram_id: providedUser?.telegram_id || '123456789',
  role: providedUser?.role || 'dispatcher',
  name: providedUser?.name || (providedUser?.first_name ? 
    `${providedUser.first_name}${providedUser.last_name ? ` ${providedUser.last_name}` : ''}` : 
    'Demo User'),
  username: providedUser?.username || 'demouser',
  photo_url: providedUser?.photo_url
});

const mockOrders: Order[] = [
  {
    id: '1',
    created_by: '123456789',
    status: 'new',
    customer: 'Acme Corp',
    address: '123 Business St, Downtown',
    eta: '2024-01-20T14:00:00Z',
    notes: 'Fragile items, handle with care',
    items: [
      { name: 'Laptop', quantity: 2 },
      { name: 'Monitor', quantity: 1 }
    ],
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    created_by: '123456789',
    status: 'assigned',
    customer: 'Tech Solutions',
    address: '456 Tech Ave, Silicon Valley',
    eta: '2024-01-20T16:00:00Z',
    notes: 'Call before delivery',
    items: [
      { name: 'Server', quantity: 1 }
    ],
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '3',
    created_by: '123456789',
    status: 'delivered',
    customer: 'StartupXYZ',
    address: '789 Innovation Blvd, Tech District',
    notes: 'Delivered successfully',
    items: [
      { name: 'Office Supplies', quantity: 5 }
    ],
    created_at: '2024-01-19T14:00:00Z',
    updated_at: '2024-01-20T09:30:00Z'
  }
];

const mockTasks: Task[] = [
  {
    id: '1',
    order_id: '2',
    courier_id: '987654321',
    status: 'enroute',
    gps: { lat: 37.7749, lng: -122.4194 },
    created_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '2',
    order_id: '1',
    courier_id: '987654321',
    status: 'pending',
    created_at: '2024-01-20T10:00:00Z'
  }
];

const mockRoute: Route = {
  id: '1',
  courier_id: '987654321',
  date: '2024-01-20',
  stops: [
    {
      order_id: '2',
      address: '456 Tech Ave, Silicon Valley',
      sequence: 1,
      status: 'enroute'
    },
    {
      order_id: '1',
      address: '123 Business St, Downtown',
      sequence: 2,
      status: 'pending'
    }
  ]
};

class FrontendMockDataStore implements DataStore {
  private user: User;
  private orders: Order[] = [...mockOrders];
  private tasks: Task[] = [...mockTasks];
  private routes: Route[] = [mockRoute];

  constructor(providedUser?: any) {
    this.user = createMockUser(providedUser);
  }

  async updateProfile(updates: Partial<User>): Promise<void> {
    this.user = { ...this.user, ...updates };
  }

  async getProfile(): Promise<User> {
    return this.user;
  }

  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let filtered = [...this.orders];
    
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer.toLowerCase().includes(query) ||
        order.address.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getOrder(id: string): Promise<Order> {
    const order = this.orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    return order;
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const order: Order = {
      ...input,
      id,
      created_at: now,
      updated_at: now
    };
    
    this.orders.unshift(order);
    return { id };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Order not found');
    
    this.orders[index] = {
      ...this.orders[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  async listMyTasks(): Promise<Task[]> {
    return this.tasks.filter(task => task.courier_id === '987654321');
  }

  async completeTask(id: string, proof?: { photo?: string; qr?: string; gps?: { lat: number; lng: number } }): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error('Task not found');
    
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      status: 'done',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      gps: proof?.gps || this.tasks[taskIndex].gps
    };
    
    const task = this.tasks[taskIndex];
    const orderIndex = this.orders.findIndex(o => o.id === task.order_id);
    if (orderIndex !== -1) {
      this.orders[orderIndex].status = 'delivered';
      this.orders[orderIndex].updated_at = new Date().toISOString();
    }
  }

  async getMyRoute(date: string): Promise<Route | null> {
    return this.routes.find(route => route.date === date && route.courier_id === '987654321') || null;
  }
}

export function createFrontendDataStore(cfg: BootstrapConfig, mode: 'demo' | 'real', user?: any): DataStore {
  // For now, always return mock data store for frontend
  // In the future, you could implement an ApiDataStore that makes HTTP requests to your backend
  return new FrontendMockDataStore(user);
}