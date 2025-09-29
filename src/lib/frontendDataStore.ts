import { DataStore, User, Order, Task, Product, Route, GroupChat, Channel, Notification, BootstrapConfig } from '../../data/types';

// Mock data for Hebrew logistics company
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'מחשב נייד Dell',
    sku: 'DELL-001',
    price: 3500,
    stock_quantity: 25,
    category: 'מחשבים',
    description: 'מחשב נייד Dell Inspiron 15',
    warehouse_location: 'מחסן א - מדף 1',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    name: 'עכבר אלחוטי',
    sku: 'MOUSE-001',
    price: 120,
    stock_quantity: 150,
    category: 'אביזרים',
    description: 'עכבר אלחוטי Logitech',
    warehouse_location: 'מחסן ב - מדף 3',
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  }
];

const mockOrders: Order[] = [
  {
    id: '1',
    customer_name: 'יוסי כהן',
    customer_phone: '050-1234567',
    customer_address: 'רחוב הרצל 15, תל אביב',
    status: 'new',
    items: [
      { product_id: '1', product_name: 'מחשב נייד Dell', quantity: 1, price: 3500 },
      { product_id: '2', product_name: 'עכבר אלחוטי', quantity: 2, price: 120 }
    ],
    total_amount: 3740,
    notes: 'משלוח דחוף',
    delivery_date: '2024-01-21T14:00:00Z',
    created_by: '123456789',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    customer_name: 'שרה לוי',
    customer_phone: '052-9876543',
    customer_address: 'שדרות רוטשילד 45, תל אביב',
    status: 'confirmed',
    items: [
      { product_id: '2', product_name: 'עכבר אלחוטי', quantity: 5, price: 120 }
    ],
    total_amount: 600,
    delivery_date: '2024-01-22T16:00:00Z',
    created_by: '123456789',
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  }
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'הכנת הזמנה #1',
    description: 'הכנת מוצרים להזמנה של יוסי כהן',
    type: 'warehouse',
    status: 'pending',
    assigned_to: '987654321',
    assigned_by: '123456789',
    priority: 'high',
    due_date: '2024-01-21T12:00:00Z',
    order_id: '1',
    created_at: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    title: 'משלוח להזמנה #2',
    description: 'משלוח מוצרים לשרה לוי',
    type: 'delivery',
    status: 'in_progress',
    assigned_to: '555666777',
    assigned_by: '123456789',
    priority: 'medium',
    due_date: '2024-01-22T16:00:00Z',
    order_id: '2',
    created_at: '2024-01-20T11:00:00Z'
  }
];

const mockGroupChats: GroupChat[] = [
  {
    id: '1',
    name: 'צוות משלוחים',
    type: 'department',
    department: 'delivery',
    members: ['123456789', '555666777'],
    description: 'תיאום משלוחים יומי',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'צוות מחסן',
    type: 'department',
    department: 'warehouse',
    members: ['123456789', '987654321'],
    description: 'ניהול מלאי ומחסן',
    created_at: '2024-01-15T10:00:00Z'
  }
];

const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'הודעות חברה',
    type: 'announcements',
    description: 'הודעות רשמיות מההנהלה',
    subscribers: ['123456789', '987654321', '555666777'],
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'עדכוני מערכת',
    type: 'updates',
    description: 'עדכונים טכניים ושיפורים',
    subscribers: ['123456789', '987654321', '555666777'],
    created_at: '2024-01-15T10:00:00Z'
  }
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'הזמנה חדשה',
    message: 'הזמנה חדשה מיוסי כהן - ₪3,740',
    type: 'info',
    recipient_id: '123456789',
    read: false,
    action_url: '/orders/1',
    created_at: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    title: 'משימה הוקצתה',
    message: 'הוקצתה לך משימה: הכנת הזמנה #1',
    type: 'info',
    recipient_id: '987654321',
    read: false,
    action_url: '/tasks/1',
    created_at: '2024-01-20T10:30:00Z'
  }
];

// Create mock user based on role
const createMockUser = (providedUser?: any): User => {
  const roles = ['manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'];
  const defaultRole = providedUser?.role || 'manager';
  
  return {
    telegram_id: providedUser?.telegram_id || '123456789',
    role: defaultRole,
    name: providedUser?.name || (providedUser?.first_name ? 
      `${providedUser.first_name}${providedUser.last_name ? ` ${providedUser.last_name}` : ''}` : 
      'משתמש דמו'),
    username: providedUser?.username || 'demouser',
    photo_url: providedUser?.photo_url,
    department: getDepartmentByRole(defaultRole),
    phone: '050-1234567'
  };
};

function getDepartmentByRole(role: string): string {
  switch (role) {
    case 'manager': return 'הנהלה';
    case 'dispatcher': return 'מוקד';
    case 'driver': return 'משלוחים';
    case 'warehouse': return 'מחסן';
    case 'sales': return 'מכירות';
    case 'customer_service': return 'שירות לקוחות';
    default: return 'כללי';
  }
}

class HebrewLogisticsDataStore implements DataStore {
  private user: User;
  private products: Product[] = [...mockProducts];
  private orders: Order[] = [...mockOrders];
  private tasks: Task[] = [...mockTasks];
  private groupChats: GroupChat[] = [...mockGroupChats];
  private channels: Channel[] = [...mockChannels];
  private notifications: Notification[] = [...mockNotifications];

  constructor(providedUser?: any) {
    this.user = createMockUser(providedUser);
  }

  async getProfile(): Promise<User> {
    return this.user;
  }

  async updateProfile(updates: Partial<User>): Promise<void> {
    this.user = { 
      ...this.user, 
      ...updates,
      department: updates.role ? getDepartmentByRole(updates.role) : this.user.department
    };
  }

  // Products
  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    let filtered = [...this.products];
    
    if (filters?.category && filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description?.includes(query)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getProduct(id: string): Promise<Product> {
    const product = this.products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const product: Product = {
      ...input,
      id,
      created_at: now,
      updated_at: now
    };
    
    this.products.unshift(product);
    return { id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');
    
    this.products[index] = {
      ...this.products[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  // Orders
  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let filtered = [...this.orders];
    
    // Role-based filtering: salespeople can only see their own orders
    if (this.user.role === 'sales') {
      filtered = filtered.filter(order => order.created_by === this.user.telegram_id);
    }
    // Managers can see all orders (no additional filtering needed)
    
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name.includes(query) ||
        order.customer_phone.includes(query) ||
        order.customer_address.includes(query)
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
    // Only managers and sales can create orders
    if (!['manager', 'sales'].includes(this.user.role)) {
      throw new Error('אין לך הרשאה ליצור הזמנות');
    }
    
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const order: Order = {
      ...input,
      created_by: this.user.telegram_id, // Always set to current user
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
    
    const order = this.orders[index];
    
    // Role-based update permissions
    if (this.user.role === 'sales' && order.created_by !== this.user.telegram_id) {
      throw new Error('אין לך הרשאה לערוך הזמנה זו');
    }
    
    this.orders[index] = {
      ...this.orders[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  // Tasks
  async listMyTasks(): Promise<Task[]> {
    return this.tasks.filter(task => task.assigned_to === this.user.telegram_id);
  }

  async listAllTasks(): Promise<Task[]> {
    return [...this.tasks];
  }

  async createTask(input: Omit<Task, 'id' | 'created_at'>): Promise<{ id: string }> {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const task: Task = {
      ...input,
      id,
      created_at: now
    };
    
    this.tasks.unshift(task);
    return { id };
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    
    this.tasks[index] = {
      ...this.tasks[index],
      ...updates
    };
  }

  async completeTask(id: string, proof?: { photo?: string; location?: string; notes?: string }): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error('Task not found');
    
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      location: proof?.location
    };
  }

  // Routes
  async getMyRoute(date: string): Promise<Route | null> {
    // Mock route for drivers
    if (this.user.role === 'driver') {
      return {
        id: '1',
        driver_id: this.user.telegram_id,
        date,
        orders: ['1', '2'],
        status: 'planned',
        estimated_duration: 240, // 4 hours
        created_at: new Date().toISOString()
      };
    }
    return null;
  }

  async createRoute(input: Omit<Route, 'id' | 'created_at'>): Promise<{ id: string }> {
    const id = Date.now().toString();
    return { id };
  }

  // Communications
  async listGroupChats(): Promise<GroupChat[]> {
    return this.groupChats.filter(chat => 
      chat.members.includes(this.user.telegram_id)
    );
  }

  async listChannels(): Promise<Channel[]> {
    return this.channels.filter(channel => 
      channel.subscribers.includes(this.user.telegram_id)
    );
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.notifications.filter(notification => 
      notification.recipient_id === this.user.telegram_id
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async markNotificationRead(id: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].read = true;
    }
  }
}

export function createFrontendDataStore(cfg: BootstrapConfig, mode: 'real', user?: any): DataStore {
  return new HebrewLogisticsDataStore(user);
}