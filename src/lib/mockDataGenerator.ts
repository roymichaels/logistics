const STORAGE_PREFIX = 'mock-data:';

type MockDataType = 'products' | 'orders' | 'users' | 'drivers' | 'businesses' | 'inventory' | 'messages';

const generators = {
  products: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `prod-${i + 1}`,
    name: `Product ${i + 1}`,
    price: Math.floor(Math.random() * 100) + 10,
    description: `Mock product description ${i + 1}`,
    category: ['coffee', 'tea', 'snacks', 'beverages'][Math.floor(Math.random() * 4)],
    stock: Math.floor(Math.random() * 100),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  orders: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `ord-${i + 1}`,
    total: Math.floor(Math.random() * 500) + 50,
    status: ['pending', 'processing', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
    customerId: `user-${Math.floor(Math.random() * 25) + 1}`,
    items: Math.floor(Math.random() * 5) + 1,
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  users: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['customer', 'manager', 'owner'][Math.floor(Math.random() * 3)],
    kycStatus: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  drivers: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `drv-${i + 1}`,
    name: `Driver ${i + 1}`,
    status: ['available', 'busy', 'offline'][Math.floor(Math.random() * 3)],
    rating: (Math.random() * 2 + 3).toFixed(1),
    totalDeliveries: Math.floor(Math.random() * 500),
    vehicle: ['bike', 'car', 'motorcycle'][Math.floor(Math.random() * 3)],
    createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  businesses: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `biz-${i + 1}`,
    name: `Business ${i + 1}`,
    type: ['restaurant', 'cafe', 'store', 'warehouse'][Math.floor(Math.random() * 4)],
    status: 'active',
    revenue: Math.floor(Math.random() * 100000) + 10000,
    employees: Math.floor(Math.random() * 50) + 5,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  inventory: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `inv-${i + 1}`,
    productId: `prod-${Math.floor(Math.random() * 50) + 1}`,
    quantity: Math.floor(Math.random() * 1000),
    location: `Warehouse ${Math.floor(Math.random() * 5) + 1}`,
    lastRestocked: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
  })),

  messages: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `msg-${i + 1}`,
    senderId: `user-${Math.floor(Math.random() * 25) + 1}`,
    receiverId: `user-${Math.floor(Math.random() * 25) + 1}`,
    content: `Mock message content ${i + 1}`,
    read: Math.random() > 0.5,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  })),
};

export const mockDataGenerator = {
  generate(type: MockDataType, count: number) {
    const data = generators[type](count);
    localStorage.setItem(`${STORAGE_PREFIX}${type}`, JSON.stringify(data));
    return data;
  },

  get(type: MockDataType) {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${type}`);
    return stored ? JSON.parse(stored) : null;
  },

  clear(type: MockDataType) {
    localStorage.removeItem(`${STORAGE_PREFIX}${type}`);
  },

  clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },

  isEnabled(type: MockDataType) {
    return localStorage.getItem(`${STORAGE_PREFIX}${type}`) !== null;
  },

  getAll() {
    const all: Record<string, any[]> = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        const type = key.replace(STORAGE_PREFIX, '');
        all[type] = JSON.parse(localStorage.getItem(key) || '[]');
      }
    });
    return all;
  }
};
