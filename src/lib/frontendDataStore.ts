import {
  DataStore,
  User,
  Order,
  Task,
  Product,
  Route,
  GroupChat,
  Channel,
  Notification,
  BootstrapConfig,
  CreateOrderInput,
  DriverInventoryRecord,
  Zone,
  DriverZoneAssignment,
  DriverStatusRecord,
  DriverMovementLog,
  DriverAvailabilityStatus,
  DriverMovementAction,
  ManagerDashboardSnapshot,
  DashboardHourlyPoint,
  DashboardDailyPoint,
  ZoneCoverageSnapshot,
  InventoryAlert,
  RestockRequest
} from '../../data/types';

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

const mockZones: Zone[] = [
  {
    id: 'zone-tlv-center',
    name: 'מרכז תל אביב',
    code: 'TLV-C',
    description: 'אזור מרכז תל אביב והעיר הלבנה',
    color: '#007aff',
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z'
  },
  {
    id: 'zone-tlv-north',
    name: 'צפון תל אביב והרצליה',
    code: 'TLV-N',
    description: 'החל מנמל תל אביב ועד הרצליה',
    color: '#34c759',
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z'
  },
  {
    id: 'zone-ramat-gan',
    name: 'רמת גן וגבעתיים',
    code: 'RG-GV',
    description: 'כולל אזור הבורסה ופארק פרס',
    color: '#ff9500',
    active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z'
  }
];

const mockDriverZones: DriverZoneAssignment[] = [
  {
    id: 'dz-1',
    driver_id: '555666777',
    zone_id: 'zone-tlv-center',
    active: true,
    assigned_at: '2024-01-20T06:00:00Z',
    assigned_by: '123456789',
    zone: mockZones[0]
  },
  {
    id: 'dz-2',
    driver_id: '555666777',
    zone_id: 'zone-tlv-north',
    active: true,
    assigned_at: '2024-01-20T06:00:00Z',
    assigned_by: '123456789',
    zone: mockZones[1]
  },
  {
    id: 'dz-3',
    driver_id: '777888999',
    zone_id: 'zone-ramat-gan',
    active: true,
    assigned_at: '2024-01-20T06:00:00Z',
    assigned_by: '123456789',
    zone: mockZones[2]
  }
];

const nowIso = new Date().toISOString();

const mockDriverInventoryRecords: DriverInventoryRecord[] = [
  {
    id: 'di-1',
    driver_id: '555666777',
    product_id: '1',
    quantity: 5,
    updated_at: nowIso,
    product: mockProducts[0]
  },
  {
    id: 'di-2',
    driver_id: '555666777',
    product_id: '2',
    quantity: 10,
    updated_at: nowIso,
    product: mockProducts[1]
  },
  {
    id: 'di-3',
    driver_id: '777888999',
    product_id: '2',
    quantity: 4,
    updated_at: nowIso,
    product: mockProducts[1]
  }
];

const mockDriverStatuses: DriverStatusRecord[] = [
  {
    driver_id: '555666777',
    status: 'available',
    is_online: true,
    current_zone_id: 'zone-tlv-center',
    last_updated: '2024-01-20T07:00:00Z',
    note: 'מוכן לקבל משלוחים',
    zone: mockZones[0]
  },
  {
    driver_id: '777888999',
    status: 'on_break',
    is_online: true,
    current_zone_id: 'zone-ramat-gan',
    last_updated: '2024-01-20T07:30:00Z',
    note: 'חוזר בעוד 15 דקות',
    zone: mockZones[2]
  }
];

const mockDriverMovements: DriverMovementLog[] = [
  {
    id: 'dm-1',
    driver_id: '555666777',
    zone_id: 'zone-tlv-center',
    action: 'zone_joined',
    details: 'הצטרף לאזור הבוקר',
    created_at: '2024-01-20T06:00:00Z',
    zone: mockZones[0]
  },
  {
    id: 'dm-2',
    driver_id: '555666777',
    product_id: '1',
    quantity_change: 5,
    action: 'inventory_added',
    details: 'קיבל מלאי מהמגורים',
    created_at: '2024-01-20T06:30:00Z',
    product: mockProducts[0]
  },
  {
    id: 'dm-3',
    driver_id: '777888999',
    zone_id: 'zone-ramat-gan',
    action: 'status_changed',
    details: 'יצא להפסקה',
    created_at: '2024-01-20T07:25:00Z',
    zone: mockZones[2]
  }
];

// Create mock user based on role
const createMockUser = (providedUser?: any): User => {
  // Check for demo role in localStorage
  const demoRole = localStorage.getItem('demo_role');
  const defaultRole = demoRole || providedUser?.role || 'user';
  
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
    case 'user': return 'כללי';
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
  private zones: Zone[] = [...mockZones];
  private driverZones: DriverZoneAssignment[] = [...mockDriverZones];
  private driverInventory: DriverInventoryRecord[] = [...mockDriverInventoryRecords];
  private driverStatuses: DriverStatusRecord[] = [...mockDriverStatuses];
  private driverMovements: DriverMovementLog[] = [...mockDriverMovements];

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

  async listDriverInventory(filters?: { driver_id?: string; product_id?: string; driver_ids?: string[] }): Promise<DriverInventoryRecord[]> {
    let records = [...this.driverInventory];

    if (filters?.driver_id) {
      records = records.filter(record => record.driver_id === filters.driver_id);
    }

    if (filters?.driver_ids && filters.driver_ids.length > 0) {
      records = records.filter(record => filters.driver_ids!.includes(record.driver_id));
    }

    if (filters?.product_id) {
      records = records.filter(record => record.product_id === filters.product_id);
    }

    return records.map(record => ({ ...record }));
  }

  async adjustDriverInventory(input: {
    driver_id: string;
    product_id: string;
    quantity_change: number;
    reason: string;
    notes?: string;
    zone_id?: string | null;
  }): Promise<void> {
    const existingIndex = this.driverInventory.findIndex(
      record => record.driver_id === input.driver_id && record.product_id === input.product_id
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const current = this.driverInventory[existingIndex];
      const newQuantity = current.quantity + input.quantity_change;
      if (newQuantity < 0) {
        throw new Error('לא ניתן להוריד את המלאי של הנהג מתחת לאפס');
      }

      this.driverInventory[existingIndex] = {
        ...current,
        quantity: newQuantity,
        updated_at: now
      };
    } else {
      if (input.quantity_change < 0) {
        throw new Error('אין מלאי נהג להוריד עבור מוצר זה');
      }

      this.driverInventory.push({
        id: `di-${Date.now()}`,
        driver_id: input.driver_id,
        product_id: input.product_id,
        quantity: input.quantity_change,
        updated_at: now,
        product: this.products.find(product => product.id === input.product_id)
      });
    }

    this.driverMovements.unshift({
      id: `dm-${Date.now()}`,
      driver_id: input.driver_id,
      zone_id: input.zone_id ?? undefined,
      product_id: input.product_id,
      quantity_change: input.quantity_change,
      action: input.quantity_change >= 0 ? 'inventory_added' : 'inventory_removed',
      details: input.notes ? `${input.reason} - ${input.notes}` : input.reason,
      created_at: now,
      zone: input.zone_id ? this.zones.find(zone => zone.id === input.zone_id) : undefined,
      product: this.products.find(product => product.id === input.product_id)
    });
  }

  async listZones(): Promise<Zone[]> {
    return [...this.zones];
  }

  async getZone(id: string): Promise<Zone | null> {
    return this.zones.find(zone => zone.id === id) || null;
  }

  async listDriverZones(filters?: { driver_id?: string; zone_id?: string; activeOnly?: boolean }): Promise<DriverZoneAssignment[]> {
    let assignments = [...this.driverZones];

    if (filters?.driver_id) {
      assignments = assignments.filter(assignment => assignment.driver_id === filters.driver_id);
    }

    if (filters?.zone_id) {
      assignments = assignments.filter(assignment => assignment.zone_id === filters.zone_id);
    }

    if (filters?.activeOnly) {
      assignments = assignments.filter(assignment => assignment.active);
    }

    return assignments.map(assignment => ({
      ...assignment,
      zone: this.zones.find(zone => zone.id === assignment.zone_id)
    }));
  }

  async assignDriverToZone(input: { zone_id: string; driver_id?: string; active?: boolean }): Promise<void> {
    const driverId = input.driver_id || this.user.telegram_id;
    const makeActive = input.active !== false;
    const existingIndex = this.driverZones.findIndex(
      assignment => assignment.driver_id === driverId && assignment.zone_id === input.zone_id
    );

    if (existingIndex >= 0) {
      this.driverZones[existingIndex] = {
        ...this.driverZones[existingIndex],
        active: makeActive,
        assigned_at: makeActive ? new Date().toISOString() : this.driverZones[existingIndex].assigned_at,
        unassigned_at: makeActive ? undefined : new Date().toISOString()
      };
    } else if (makeActive) {
      this.driverZones.push({
        id: `dz-${Date.now()}`,
        driver_id: driverId,
        zone_id: input.zone_id,
        active: true,
        assigned_at: new Date().toISOString(),
        assigned_by: this.user.telegram_id,
        zone: this.zones.find(zone => zone.id === input.zone_id)
      });
    }

    this.driverMovements.unshift({
      id: `dm-${Date.now()}`,
      driver_id: driverId,
      zone_id: input.zone_id,
      action: makeActive ? 'zone_joined' : 'zone_left',
      details: makeActive ? 'הצטרף לאזור' : 'עזב אזור',
      created_at: new Date().toISOString(),
      zone: this.zones.find(zone => zone.id === input.zone_id)
    });

    if (!makeActive) {
      const statusIndex = this.driverStatuses.findIndex(status => status.driver_id === driverId);
      if (statusIndex >= 0 && this.driverStatuses[statusIndex].current_zone_id === input.zone_id) {
        this.driverStatuses[statusIndex] = {
          ...this.driverStatuses[statusIndex],
          current_zone_id: undefined,
          zone: undefined,
          last_updated: new Date().toISOString()
        };
      }
    }
  }

  async updateDriverStatus(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void> {
    const driverId = input.driver_id || this.user.telegram_id;
    const index = this.driverStatuses.findIndex(status => status.driver_id === driverId);
    const now = new Date().toISOString();

    const zone = typeof input.zone_id === 'string'
      ? this.zones.find(z => z.id === input.zone_id)
      : input.zone_id === null
        ? undefined
        : index >= 0
          ? this.driverStatuses[index].zone
          : undefined;

    const currentZoneId = typeof input.zone_id === 'undefined'
      ? index >= 0 ? this.driverStatuses[index].current_zone_id : undefined
      : input.zone_id;

    const payload: DriverStatusRecord = {
      driver_id: driverId,
      status: input.status,
      is_online: typeof input.is_online === 'boolean' ? input.is_online : input.status !== 'off_shift',
      current_zone_id: currentZoneId,
      last_updated: now,
      note: input.note,
      zone
    };

    if (index >= 0) {
      this.driverStatuses[index] = payload;
    } else {
      this.driverStatuses.push(payload);
    }

    this.driverMovements.unshift({
      id: `dm-${Date.now()}`,
      driver_id: driverId,
      zone_id: currentZoneId,
      action: 'status_changed',
      details: `סטטוס עודכן ל-${input.status}`,
      created_at: now,
      zone
    });
  }

  async getDriverStatus(driver_id?: string): Promise<DriverStatusRecord | null> {
    const driverId = driver_id || this.user.telegram_id;
    const status = this.driverStatuses.find(record => record.driver_id === driverId);
    return status ? { ...status } : null;
  }

  async listDriverStatuses(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]> {
    let statuses = [...this.driverStatuses];

    if (filters?.zone_id) {
      statuses = statuses.filter(status => status.current_zone_id === filters.zone_id);
    }

    if (filters?.onlyOnline) {
      statuses = statuses.filter(status => status.is_online);
    }

    return statuses.map(status => ({ ...status }));
  }

  async logDriverMovement(input: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string;
  }): Promise<void> {
    this.driverMovements.unshift({
      id: `dm-${Date.now()}`,
      driver_id: input.driver_id,
      zone_id: input.zone_id ?? undefined,
      product_id: input.product_id ?? undefined,
      quantity_change: input.quantity_change ?? undefined,
      action: input.action,
      details: input.details,
      created_at: new Date().toISOString(),
      zone: input.zone_id ? this.zones.find(zone => zone.id === input.zone_id) : undefined,
      product: input.product_id ? this.products.find(product => product.id === input.product_id) : undefined
    });
  }

  async listDriverMovements(filters?: { driver_id?: string; zone_id?: string; limit?: number }): Promise<DriverMovementLog[]> {
    let movements = [...this.driverMovements];

    if (filters?.driver_id) {
      movements = movements.filter(movement => movement.driver_id === filters.driver_id);
    }

    if (filters?.zone_id) {
      movements = movements.filter(movement => movement.zone_id === filters.zone_id);
    }

    movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filters?.limit) {
      movements = movements.slice(0, filters.limit);
    }

    return movements.map(movement => ({ ...movement }));
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

  async createOrder(input: CreateOrderInput): Promise<{ id: string }> {
    if (!['manager', 'sales'].includes(this.user.role)) {
      throw new Error('אין לך הרשאה ליצור הזמנות');
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('Order must include at least one item');
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();
    const salespersonId = input.salesperson_id || this.user.telegram_id;
    const status = input.status || 'new';
    const totalAmount = typeof input.total_amount === 'number'
      ? input.total_amount
      : input.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    const order: Order = {
      id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_address: input.customer_address,
      status,
      items: input.items,
      total_amount: totalAmount,
      notes: input.notes,
      delivery_date: input.delivery_date,
      created_by: this.user.telegram_id,
      salesperson_id: salespersonId,
      entry_mode: input.entry_mode,
      raw_order_text: input.raw_order_text,
      created_at: now,
      updated_at: now
    };

    this.orders.unshift(order);

    // Simulate inventory reservation in the local cache
    order.items.forEach(item => {
      const index = this.products.findIndex(product => product.id === item.product_id);
      if (index !== -1) {
        const product = this.products[index];
        this.products[index] = {
          ...product,
          stock_quantity: Math.max(0, (product.stock_quantity ?? 0) - item.quantity)
        };
      }
    });

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

  async getManagerDashboardSnapshot(): Promise<ManagerDashboardSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const previousDayStart = new Date(startOfDay);
    previousDayStart.setDate(previousDayStart.getDate() - 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const withinRange = (dateStr: string, from: Date, to: Date) => {
      const value = new Date(dateStr);
      return value >= from && value <= to;
    };

    const isOpenStatus = (status: Order['status']) =>
      ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);

    const todaysOrders = this.orders.filter(order =>
      withinRange(order.created_at, startOfDay, now) && order.status !== 'cancelled'
    );
    const yesterdaysOrders = this.orders.filter(order =>
      withinRange(order.created_at, previousDayStart, startOfDay) && order.status !== 'cancelled'
    );
    const weekOrders = this.orders.filter(order =>
      withinRange(order.created_at, startOfWeek, now)
    );

    const summarizeRevenue = (orders: Order[]) =>
      orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const summarizeVolume = (orders: Order[]) =>
      orders.reduce((total, order) => {
        return total + (order.items || []).reduce((count, item) => count + Number(item.quantity || 0), 0);
      }, 0);

    const computeChange = (todayValue: number, previousValue: number) => {
      if (previousValue === 0) {
        return todayValue > 0 ? 100 : 0;
      }
      return ((todayValue - previousValue) / previousValue) * 100;
    };

    const revenueToday = summarizeRevenue(todaysOrders);
    const revenueYesterday = summarizeRevenue(yesterdaysOrders);
    const ordersTodayCount = todaysOrders.length;
    const ordersYesterdayCount = yesterdaysOrders.length;
    const volumeToday = summarizeVolume(todaysOrders);
    const averageOrderValue = ordersTodayCount > 0 ? revenueToday / ordersTodayCount : 0;

    const hourlyMap = new Map<string, DashboardHourlyPoint>();
    todaysOrders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const label = `${hour.toString().padStart(2, '0')}:00`;
      if (!hourlyMap.has(label)) {
        hourlyMap.set(label, { hour: label, orders: 0, revenue: 0, volume: 0 });
      }
      const bucket = hourlyMap.get(label)!;
      bucket.orders += 1;
      bucket.revenue += Number(order.total_amount || 0);
      bucket.volume += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    });

    const hourly: DashboardHourlyPoint[] = [];
    for (let hour = 0; hour <= now.getHours(); hour += 1) {
      const label = `${hour.toString().padStart(2, '0')}:00`;
      hourly.push(hourlyMap.get(label) || { hour: label, orders: 0, revenue: 0, volume: 0 });
    }

    const trendBuckets = new Map<string, DashboardDailyPoint>();
    const iterator = new Date(startOfWeek);
    while (iterator <= now) {
      const key = iterator.toISOString().slice(0, 10);
      trendBuckets.set(key, { date: key, orders: 0, revenue: 0, volume: 0 });
      iterator.setDate(iterator.getDate() + 1);
    }

    weekOrders.forEach(order => {
      const key = new Date(order.created_at).toISOString().slice(0, 10);
      if (!trendBuckets.has(key)) {
        trendBuckets.set(key, { date: key, orders: 0, revenue: 0, volume: 0 });
      }
      const bucket = trendBuckets.get(key)!;
      if (order.status !== 'cancelled') {
        bucket.orders += 1;
        bucket.revenue += Number(order.total_amount || 0);
        bucket.volume += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      }
    });

    const trend = Array.from(trendBuckets.values()).sort((a, b) => a.date.localeCompare(b.date));

    const driverStatuses = [...this.driverStatuses];
    const activeAssignments = this.driverZones.filter(zone => zone.active);
    const zones = [...this.zones];

    const totalDrivers = driverStatuses.length;
    const activeDrivers = driverStatuses.filter(status => status.is_online && status.status !== 'off_shift').length;
    const onlineRatio = totalDrivers > 0 ? activeDrivers / totalDrivers : 0;

    const assignmentMap = new Map<string, Set<string>>();
    activeAssignments.forEach(assignment => {
      if (!assignmentMap.has(assignment.zone_id)) {
        assignmentMap.set(assignment.zone_id, new Set());
      }
      assignmentMap.get(assignment.zone_id)!.add(assignment.driver_id);
    });

    const activeMap = new Map<string, Set<string>>();
    driverStatuses.forEach(status => {
      if (!status.is_online || status.status === 'off_shift') {
        return;
      }
      const resolvedZone = status.current_zone_id || activeAssignments.find(assignment => assignment.driver_id === status.driver_id)?.zone_id;
      if (!resolvedZone) return;
      if (!activeMap.has(resolvedZone)) {
        activeMap.set(resolvedZone, new Set());
      }
      activeMap.get(resolvedZone)!.add(status.driver_id);
    });

    const openOrders = this.orders.filter(order => isOpenStatus(order.status));
    const openOrderMap = new Map<string, number>();
    let unassignedOrders = 0;
    openOrders.forEach(order => {
      const assignedDriver = order.assigned_driver;
      if (assignedDriver) {
        const status = driverStatuses.find(ds => ds.driver_id === assignedDriver);
        const zoneId = status?.current_zone_id || activeAssignments.find(assignment => assignment.driver_id === assignedDriver)?.zone_id;
        if (zoneId) {
          openOrderMap.set(zoneId, (openOrderMap.get(zoneId) || 0) + 1);
        } else {
          unassignedOrders += 1;
        }
      } else {
        unassignedOrders += 1;
      }
    });

    const zoneSnapshots: ZoneCoverageSnapshot[] = zones.map(zone => {
      const assigned = assignmentMap.get(zone.id) || new Set();
      const active = activeMap.get(zone.id) || new Set();
      const coverage = assigned.size === 0
        ? (active.size > 0 ? 100 : 0)
        : Math.round((active.size / assigned.size) * 100);

      return {
        zone_id: zone.id,
        zone_name: zone.name,
        coverage_percent: coverage,
        active_drivers: active.size,
        assigned_drivers: assigned.size,
        open_orders: openOrderMap.get(zone.id) || 0,
        unassigned_orders: 0
      };
    });

    if (unassignedOrders > 0) {
      zoneSnapshots.push({
        zone_id: 'unassigned',
        zone_name: 'ללא שיוך',
        coverage_percent: 0,
        active_drivers: 0,
        assigned_drivers: 0,
        open_orders: unassignedOrders,
        unassigned_orders: unassignedOrders
      });
    }

    const baseZoneCount = zoneSnapshots.filter(zone => zone.zone_id !== 'unassigned').length;
    const zoneCoverageAverage = baseZoneCount > 0
      ? zoneSnapshots
          .filter(zone => zone.zone_id !== 'unassigned')
          .reduce((sum, zone) => sum + zone.coverage_percent, 0) / baseZoneCount
      : (activeDrivers > 0 ? 100 : 0);

    const lowStockAlerts: InventoryAlert[] = this.products
      .filter(product => product.stock_quantity < 25)
      .map(product => ({
        product_id: product.id,
        product_name: product.name,
        location_id: 'location-central',
        location_name: 'מרכז הפצה ראשי',
        on_hand_quantity: product.stock_quantity,
        reserved_quantity: 0,
        low_stock_threshold: 25,
        triggered_at: now.toISOString()
      }));

    const restockRequests: RestockRequest[] = lowStockAlerts.slice(0, 5).map((alert, index) => ({
      id: `restock-${index}`,
      product_id: alert.product_id,
      requested_by: this.user.telegram_id,
      requested_quantity: Math.max(15, 60 - alert.on_hand_quantity),
      status: 'pending',
      from_location_id: null,
      to_location_id: alert.location_id,
      approved_by: null,
      approved_quantity: null,
      fulfilled_by: null,
      fulfilled_quantity: null,
      notes: 'חידוש מלאי אוטומטי',
      created_at: new Date(now.getTime() - (index + 1) * 3600000).toISOString(),
      updated_at: now.toISOString(),
      product: this.products.find(product => product.id === alert.product_id)
    }));

    return {
      generated_at: now.toISOString(),
      metrics: {
        revenue_today: revenueToday,
        revenue_change: computeChange(revenueToday, revenueYesterday),
        orders_today: ordersTodayCount,
        orders_change: computeChange(ordersTodayCount, ordersYesterdayCount),
        average_order_value: averageOrderValue,
        volume_today: volumeToday,
        active_drivers: activeDrivers,
        total_drivers: totalDrivers,
        online_ratio: onlineRatio,
        zone_coverage: Math.round(zoneCoverageAverage),
        low_stock_count: lowStockAlerts.length,
        restock_pending: restockRequests.length
      },
      hourly,
      trend,
      zone_coverage: zoneSnapshots,
      low_stock_alerts: lowStockAlerts.slice(0, 8),
      restock_requests: restockRequests
    };
  }

  async exportOrdersToCSV(): Promise<string> {
    const headers = ['מספר הזמנה', 'לקוח', 'טלפון', 'כתובת', 'סטטוס', 'סכום', 'תאריך'];
    const rows = this.orders.map(order => [
      order.id,
      order.customer_name,
      order.customer_phone,
      `"${order.customer_address}"`,
      order.status,
      order.total_amount,
      order.created_at
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  async exportProductsToCSV(): Promise<string> {
    const headers = ['מוצר', 'SKU', 'מחיר', 'מלאי'];
    const rows = this.products.map(product => [
      `"${product.name}"`,
      product.sku,
      product.price,
      product.stock_quantity
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export async function createFrontendDataStore(cfg: BootstrapConfig, mode: 'real', user?: any): Promise<DataStore> {
  // Use Supabase for real mode if configured, otherwise fallback to mock
  if (cfg.adapters.data === 'postgres' && import.meta.env.VITE_SUPABASE_URL) {
    const { createSupabaseDataStore } = await import('./supabaseDataStore');
    return createSupabaseDataStore(user?.telegram_id, user?.auth_token);
  }

  // Fallback to mock data store for development/demo
  return new HebrewLogisticsDataStore(user);
}