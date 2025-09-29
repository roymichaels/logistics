import { DataStore, User, Order, Task, Route, BootstrapConfig } from '../../data/types';

const mockDeliveryOrders = [
  {
    id: 'del-1',
    created_by: '123456789',
    status: 'new' as const,
    customer: 'John Smith',
    address: '123 Main St, Downtown',
    eta: '2024-01-20T14:00:00Z',
    notes: 'Ring doorbell twice',
    items: [
      { name: 'Pizza Margherita', quantity: 2 },
      { name: 'Coca Cola', quantity: 3 }
    ],
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'del-2',
    created_by: '123456789',
    status: 'assigned' as const,
    customer: 'Sarah Johnson',
    address: '456 Oak Ave, Uptown',
    eta: '2024-01-20T16:00:00Z',
    notes: 'Leave at door if no answer',
    items: [
      { name: 'Laptop Computer', quantity: 1 },
      { name: 'Mouse', quantity: 1 }
    ],
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  },
  {
    id: 'del-3',
    created_by: '123456789',
    status: 'delivered' as const,
    customer: 'Mike Wilson',
    address: '789 Pine St, Midtown',
    notes: 'Delivered successfully',
    items: [
      { name: 'Office Supplies', quantity: 5 }
    ],
    created_at: '2024-01-19T14:00:00Z',
    updated_at: '2024-01-20T09:30:00Z'
  }
];

const mockDeliveryTasks = [
  {
    id: 'dt-1',
    order_id: 'del-2',
    courier_id: '987654321',
    status: 'enroute' as const,
    gps: { lat: 40.7128, lng: -74.0060 },
    created_at: '2024-01-20T11:00:00Z'
  },
  {
    id: 'dt-2',
    order_id: 'del-1',
    courier_id: '987654321',
    status: 'pending' as const,
    created_at: '2024-01-20T10:00:00Z'
  }
];

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
    status: 'pending',
    item_name: 'Office Chairs',
    location: 'Warehouse A - Section 1',
    due_date: '2024-01-20T14:00:00Z',
    notes: 'Fragile items, handle with care',
    quantity: 25,
    unit: 'pieces',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    created_by: '123456789',
    status: 'assigned',
    item_name: 'Computer Monitors',
    location: 'Warehouse B - Section 3',
    due_date: '2024-01-20T16:00:00Z',
    notes: 'Check serial numbers',
    quantity: 10,
    unit: 'pieces',
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '3',
    created_by: '123456789',
    status: 'completed',
    item_name: 'Office Supplies',
    location: 'Warehouse A - Section 2',
    notes: 'Completed successfully',
    quantity: 100,
    unit: 'boxes',
    created_at: '2024-01-19T14:00:00Z',
    updated_at: '2024-01-20T09:30:00Z'
  }
];

const mockTasks: Task[] = [
  {
    id: '1',
    order_id: '2',
    worker_id: '987654321',
    status: 'in_progress',
    location: 'Warehouse B - Section 3',
    created_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '2',
    order_id: '1',
    worker_id: '987654321',
    status: 'pending',
    created_at: '2024-01-20T10:00:00Z'
  }
];

const mockRoute: Route = {
  id: '1',
  worker_id: '987654321',
  date: '2024-01-20',
  stops: [
    {
      order_id: '2',
      location: 'Warehouse B - Section 3',
      sequence: 1,
      status: 'in_progress'
    },
    {
      order_id: '1',
      location: 'Warehouse A - Section 1',
      sequence: 2,
      status: 'pending'
    }
  ]
};

class FrontendMockDataStore implements DataStore {
  private user: User;
  private orders: Order[] = [...mockOrders];
  private deliveryOrders = [...mockDeliveryOrders];
  private tasks: Task[] = [...mockTasks];
  private deliveryTasks = [...mockDeliveryTasks];
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

  async listDeliveryOrders(filters?: { status?: string; q?: string }) {
    let filtered = [...this.deliveryOrders];
    
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

  async getDeliveryOrder(id: string) {
    const order = this.deliveryOrders.find(o => o.id === id);
    if (!order) throw new Error('Delivery order not found');
    return order;
  }

  async createDeliveryOrder(input: any) {
    const id = 'del-' + Date.now().toString();
    const now = new Date().toISOString();
    
    const order = {
      ...input,
      id,
      created_at: now,
      updated_at: now
    };
    
    this.deliveryOrders.unshift(order);
    return { id };
  }

  async updateDeliveryOrder(id: string, updates: any) {
    const index = this.deliveryOrders.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Delivery order not found');
    
    this.deliveryOrders[index] = {
      ...this.deliveryOrders[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  async listMyTasks(): Promise<Task[]> {
    // Return tasks for current worker
    if (this.user.role === 'worker') {
      return this.tasks.filter(task => task.worker_id === this.user.telegram_id);
    }
    return this.tasks;
  }

  async completeTask(id: string, proof?: { photo?: string; qr?: string; location?: string }): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error('Task not found');
    
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      location: proof?.location || this.tasks[taskIndex].location
    };
    
    const task = this.tasks[taskIndex];
    const orderIndex = this.orders.findIndex(o => o.id === task.order_id);
    if (orderIndex !== -1) {
      this.orders[orderIndex].status = 'completed';
      this.orders[orderIndex].updated_at = new Date().toISOString();
    }
  }

  async listMyDeliveryTasks() {
    // Return delivery tasks for current courier
    if (this.user.role === 'courier') {
      return this.deliveryTasks.filter(task => task.courier_id === this.user.telegram_id);
    }
    return this.deliveryTasks;
  }

  async completeDeliveryTask(id: string, proof?: { photo?: string; gps?: { lat: number; lng: number } }) {
    const taskIndex = this.deliveryTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error('Delivery task not found');
    
    this.deliveryTasks[taskIndex] = {
      ...this.deliveryTasks[taskIndex],
      status: 'done',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      gps: proof?.gps || this.deliveryTasks[taskIndex].gps
    };
    
    const task = this.deliveryTasks[taskIndex];
    const orderIndex = this.deliveryOrders.findIndex(o => o.id === task.order_id);
    if (orderIndex !== -1) {
      this.deliveryOrders[orderIndex].status = 'delivered';
      this.deliveryOrders[orderIndex].updated_at = new Date().toISOString();
    }
  }

  async getMyRoute(date: string): Promise<Route | null> {
    return this.routes.find(route => route.date === date && route.worker_id === this.user.telegram_id) || null;
  }
}

export function createFrontendDataStore(cfg: BootstrapConfig, mode: 'demo' | 'real', user?: any): DataStore {
  // For now, always return mock data store for frontend
  // In the future, you could implement an ApiDataStore that makes HTTP requests to your backend
  return new FrontendMockDataStore(user);
}