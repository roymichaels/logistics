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
  DriverInventorySyncInput,
  DriverInventorySyncResult,
  RoyalDashboardSnapshot,
  RoyalDashboardMetrics,
  RoyalDashboardChartPoint,
  RoyalDashboardAgent,
  RoyalDashboardZoneCoverage,
  RoyalDashboardLowStockAlert,
  RoyalDashboardRestockRequest
} from '../data/types';
import { logger } from './logger';
import type { SxTDataStore } from './sxt/sxtDataStore';
import { getUserIdentifier } from '../utils/userIdentifier';

export type DataStoreSubscriptionTopic =
  | 'orders'
  | 'products'
  | 'tasks'
  | 'inventory'
  | 'inventory_alerts'
  | 'notifications'
  | 'businesses'
  | 'business_users'
  | 'users'
  | 'user_registrations'
  | 'driver_status'
  | 'driver_movements'
  | 'driver_zones';

export type DataStoreSubscriptionHandler<T extends DataStoreSubscriptionTopic> = (payload: unknown) => void;

export interface FrontendDataStore extends DataStore {
  subscribe: <T extends DataStoreSubscriptionTopic>(
    topic: T,
    callback: DataStoreSubscriptionHandler<T>
  ) => () => void;
  supabase?: any;
}

export function attachSubscriptionHelpers<T extends DataStore>(store: T): T & FrontendDataStore {
  const enhanced = store as T & FrontendDataStore;

  enhanced.subscribe = ((topic, callback) => {
    if (typeof store.subscribeToChanges === 'function') {
      return store.subscribeToChanges(topic, callback);
    }

    return () => {};
  }) as FrontendDataStore['subscribe'];

  // Always expose supabase client property - it will delegate to the store's getter
  // This ensures the property exists even if the client isn't immediately available
  Object.defineProperty(enhanced, 'supabase', {
    get() {
      try {
        return (store as any).supabase;
      } catch (e) {
        // Return undefined silently if not available yet
        return undefined;
      }
    },
    enumerable: true,
    configurable: true
  });

  return enhanced;
}

// UndergroundLab Security Store - Enterprise Security Hardware Products
const mockProducts: Product[] = [
  // Secured Smartphones
  {
    id: '1',
    name: 'Purism Librem 5',
    sku: 'LIBREM-5-USA',
    price: 4999,
    stock_quantity: 12,
    category: 'Secured Smartphones',
    description: 'Hardware kill switches, Linux-based OS, no backdoors. Complete digital sovereignty with open-source hardware and software.',
    warehouse_location: 'Vault A - Secure Storage',
    image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=300&fit=crop',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Silent Circle Blackphone 2',
    sku: 'SILENT-BP2',
    price: 3899,
    stock_quantity: 8,
    category: 'Secured Smartphones',
    description: 'Military-grade encryption, secure VoIP, encrypted messaging. Enterprise privacy for sensitive communications.',
    warehouse_location: 'Vault A - Secure Storage',
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    created_at: '2024-01-16T09:30:00Z',
    updated_at: '2024-01-16T09:30:00Z'
  },
  {
    id: '3',
    name: 'Bittium Tough Mobile 2',
    sku: 'BITTIUM-TM2',
    price: 5499,
    stock_quantity: 6,
    category: 'Secured Smartphones',
    description: 'Certified secure by NATO, dual-OS architecture, hardware-level security. Built for defense and government.',
    warehouse_location: 'Vault A - Secure Storage',
    image_url: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=300&fit=crop',
    created_at: '2024-01-17T11:00:00Z',
    updated_at: '2024-01-17T11:00:00Z'
  },

  // Hardware Keys
  {
    id: '4',
    name: 'YubiKey 5C NFC',
    sku: 'YUBIKEY-5C-NFC',
    price: 149,
    stock_quantity: 85,
    category: 'Hardware Keys',
    description: 'USB-C + NFC authentication key. FIDO2, U2F, smart card, OTP. Works with 1Password, LastPass, Google, Microsoft.',
    warehouse_location: 'Vault B - Authentication',
    image_url: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=400&h=300&fit=crop',
    created_at: '2024-01-18T08:00:00Z',
    updated_at: '2024-01-18T08:00:00Z'
  },
  {
    id: '5',
    name: 'Google Titan Security Key Bundle',
    sku: 'TITAN-BUNDLE',
    price: 119,
    stock_quantity: 120,
    category: 'Hardware Keys',
    description: 'USB-A + Bluetooth/NFC key set. FIDO standards certified. Protect against phishing and account takeovers.',
    warehouse_location: 'Vault B - Authentication',
    image_url: 'https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=400&h=300&fit=crop',
    created_at: '2024-01-19T10:15:00Z',
    updated_at: '2024-01-19T10:15:00Z'
  },
  {
    id: '6',
    name: 'Nitrokey 3C NFC',
    sku: 'NITROKEY-3C',
    price: 159,
    stock_quantity: 45,
    category: 'Hardware Keys',
    description: 'Open-source security key with firmware verification. FIDO2, PIV, OpenPGP. Made in Germany with privacy focus.',
    warehouse_location: 'Vault B - Authentication',
    image_url: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=300&fit=crop',
    created_at: '2024-01-20T09:45:00Z',
    updated_at: '2024-01-20T09:45:00Z'
  },
  {
    id: '7',
    name: 'OnlyKey Password Manager',
    sku: 'ONLYKEY-DUO',
    price: 189,
    stock_quantity: 35,
    category: 'Hardware Keys',
    description: 'Hardware password manager with self-destruct PIN. Stores up to 24 accounts offline. Uncrackable cold storage.',
    warehouse_location: 'Vault B - Authentication',
    image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop',
    created_at: '2024-01-21T14:20:00Z',
    updated_at: '2024-01-21T14:20:00Z'
  },

  // Privacy Devices
  {
    id: '8',
    name: 'Mission Darkness Faraday Bag',
    sku: 'FARADAY-XL',
    price: 299,
    stock_quantity: 55,
    category: 'Privacy Devices',
    description: 'Military-grade RF shielding. Blocks WiFi, Bluetooth, cellular, GPS. Certified lab-tested. Fits laptops and tablets.',
    warehouse_location: 'Vault C - Privacy Tech',
    image_url: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&h=300&fit=crop',
    created_at: '2024-01-22T08:30:00Z',
    updated_at: '2024-01-22T08:30:00Z'
  },
  {
    id: '9',
    name: 'Privacy Screen Protector 15.6"',
    sku: 'PRIVACY-156',
    price: 89,
    stock_quantity: 150,
    category: 'Privacy Devices',
    description: 'Anti-spy filter limits viewing angle to 60°. Blocks side surveillance. Blue light reduction. Easy installation.',
    warehouse_location: 'Vault C - Privacy Tech',
    image_url: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=300&fit=crop',
    created_at: '2024-01-23T11:00:00Z',
    updated_at: '2024-01-23T11:00:00Z'
  },
  {
    id: '10',
    name: 'USB Data Blocker 4-Pack',
    sku: 'JUICE-JACK-4PK',
    price: 49,
    stock_quantity: 200,
    category: 'Privacy Devices',
    description: 'Prevent juice-jacking attacks. Power-only charging, blocks data transfer. Perfect for public USB ports and travel.',
    warehouse_location: 'Vault C - Privacy Tech',
    image_url: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=300&fit=crop',
    created_at: '2024-01-24T09:15:00Z',
    updated_at: '2024-01-24T09:15:00Z'
  },
  {
    id: '11',
    name: 'Webcam Privacy Cover Set',
    sku: 'WEBCAM-COVER-10',
    price: 25,
    stock_quantity: 350,
    category: 'Privacy Devices',
    description: 'Ultra-thin sliding covers for laptops, tablets, phones. Block unauthorized camera access. Pack of 10.',
    warehouse_location: 'Vault C - Privacy Tech',
    image_url: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=300&fit=crop',
    created_at: '2024-01-25T10:30:00Z',
    updated_at: '2024-01-25T10:30:00Z'
  },

  // Network Security
  {
    id: '12',
    name: 'GL.iNet Flint 2 VPN Router',
    sku: 'GLINET-FLINT2',
    price: 699,
    stock_quantity: 28,
    category: 'Network Security',
    description: 'OpenWrt-based router with WireGuard/OpenVPN. Multi-protocol VPN client/server. Tor anonymity ready.',
    warehouse_location: 'Vault D - Network',
    image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=300&fit=crop',
    created_at: '2024-01-26T08:45:00Z',
    updated_at: '2024-01-26T08:45:00Z'
  },
  {
    id: '13',
    name: 'Protectli Vault FW6E',
    sku: 'PROTECTLI-FW6E',
    price: 1899,
    stock_quantity: 15,
    category: 'Network Security',
    description: 'pfSense/OPNsense firewall appliance. 6-port Gigabit, Intel i5, fanless. Enterprise network security.',
    warehouse_location: 'Vault D - Network',
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop',
    created_at: '2024-01-27T12:00:00Z',
    updated_at: '2024-01-27T12:00:00Z'
  },
  {
    id: '14',
    name: 'IronKey Encrypted USB 256GB',
    sku: 'IRONKEY-D300-256',
    price: 449,
    stock_quantity: 62,
    category: 'Encryption Tools',
    description: 'FIPS 140-2 Level 3 certified. AES 256-bit hardware encryption. Waterproof, tamper-proof. Self-destructs after 10 failed attempts.',
    warehouse_location: 'Vault E - Encryption',
    image_url: 'https://images.unsplash.com/photo-1588636142235-a52e0fe56c25?w=400&h=300&fit=crop',
    created_at: '2024-01-28T09:00:00Z',
    updated_at: '2024-01-28T09:00:00Z'
  },

  // Encryption Tools
  {
    id: '15',
    name: 'Apricorn Aegis Padlock SSD 2TB',
    sku: 'AEGIS-SSD-2TB',
    price: 1299,
    stock_quantity: 22,
    category: 'Encryption Tools',
    description: 'Hardware-encrypted portable SSD. PIN authentication. FIPS certified. No software needed. Military-grade protection.',
    warehouse_location: 'Vault E - Encryption',
    image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop',
    created_at: '2024-01-29T10:30:00Z',
    updated_at: '2024-01-29T10:30:00Z'
  },
  {
    id: '16',
    name: 'CipherLab Encrypted NVMe 1TB',
    sku: 'CIPHER-NVME-1TB',
    price: 899,
    stock_quantity: 38,
    category: 'Encryption Tools',
    description: 'Self-encrypting NVMe drive. Instant crypto-erase. TCG Opal 2.0 compliant. Enterprise data protection.',
    warehouse_location: 'Vault E - Encryption',
    image_url: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=400&h=300&fit=crop',
    created_at: '2024-01-30T11:45:00Z',
    updated_at: '2024-01-30T11:45:00Z'
  },

  // Security Software
  {
    id: '17',
    name: 'ProtonVPN Plus - 2 Year License',
    sku: 'PROTONVPN-2Y',
    price: 599,
    stock_quantity: 999,
    category: 'Security Software',
    description: 'Swiss VPN with Secure Core. No logs policy. 10 devices. NetShield ad-blocker. P2P and streaming optimized.',
    warehouse_location: 'Digital License',
    image_url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop',
    created_at: '2024-02-01T08:00:00Z',
    updated_at: '2024-02-01T08:00:00Z'
  },
  {
    id: '18',
    name: 'Bitdefender Total Security - 5 Devices',
    sku: 'BITDEFENDER-5DEV',
    price: 349,
    stock_quantity: 999,
    category: 'Security Software',
    description: 'Multi-layered ransomware protection. Webcam protection. Secure VPN. Parental controls. Award-winning antivirus.',
    warehouse_location: 'Digital License',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop',
    created_at: '2024-02-02T09:30:00Z',
    updated_at: '2024-02-02T09:30:00Z'
  },
  {
    id: '19',
    name: '1Password Teams - Annual',
    sku: '1PASS-TEAMS-1Y',
    price: 799,
    stock_quantity: 999,
    category: 'Security Software',
    description: 'Password manager for teams. Secure sharing. Watchtower alerts. Travel Mode. SSO integration. Up to 10 members.',
    warehouse_location: 'Digital License',
    image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=300&fit=crop',
    created_at: '2024-02-03T10:15:00Z',
    updated_at: '2024-02-03T10:15:00Z'
  },
  {
    id: '20',
    name: 'Malwarebytes Premium - 3 Devices',
    sku: 'MALWAREBYTES-3DEV',
    price: 229,
    stock_quantity: 999,
    category: 'Security Software',
    description: 'Real-time malware protection. Ransomware blocking. Exploit prevention. Brute force protection. Light on resources.',
    warehouse_location: 'Digital License',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop',
    created_at: '2024-02-04T11:00:00Z',
    updated_at: '2024-02-04T11:00:00Z'
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

  async getCurrentRole(): Promise<User['role']> {
    return this.user.role;
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
    const driverId = input.driver_id || getUserIdentifier(this.user);
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
        assigned_by: getUserIdentifier(this.user),
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
    const driverId = input.driver_id || getUserIdentifier(this.user);
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

  async setDriverOnline(input?: { driver_id?: string; zone_id?: string | null; status?: DriverAvailabilityStatus; note?: string }): Promise<void> {
    const driverId = input?.driver_id || getUserIdentifier(this.user);
    const existing = await this.getDriverStatus(driverId);
    const zoneId = input && Object.prototype.hasOwnProperty.call(input, 'zone_id')
      ? input?.zone_id ?? undefined
      : existing?.current_zone_id;
    const status: DriverAvailabilityStatus = input?.status || (existing?.status === 'off_shift' ? 'available' : existing?.status || 'available');

    await this.updateDriverStatus({
      driver_id: driverId,
      status,
      zone_id: typeof zoneId === 'undefined' ? undefined : zoneId,
      is_online: true,
      note: input?.note ?? existing?.note
    });
  }

  async setDriverOffline(input?: { driver_id?: string; note?: string }): Promise<void> {
    const driverId = input?.driver_id || getUserIdentifier(this.user);
    await this.updateDriverStatus({
      driver_id: driverId,
      status: 'off_shift',
      zone_id: null,
      is_online: false,
      note: input?.note
    });
  }

  async getDriverStatus(driver_id?: string): Promise<DriverStatusRecord | null> {
    const driverId = driver_id || getUserIdentifier(this.user);
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

  async syncDriverInventory(input: DriverInventorySyncInput): Promise<DriverInventorySyncResult> {
    const driverId = input.driver_id || getUserIdentifier(this.user);
    const now = new Date().toISOString();
    const normalizedEntries = new Map<string, { quantity: number; location_id?: string | null }>();

    for (const entry of input.entries || []) {
      if (!entry?.product_id) continue;
      const quantity = Math.max(0, Math.round(Number(entry.quantity) || 0));
      normalizedEntries.set(entry.product_id, {
        quantity,
        location_id: typeof entry.location_id === 'undefined' ? undefined : entry.location_id
      });
    }

    const existingRecords = this.driverInventory.filter(record => record.driver_id === driverId);
    const remainingRecords = this.driverInventory.filter(record => record.driver_id !== driverId);

    const updatedRecords: DriverInventoryRecord[] = [];
    let updatedCount = 0;
    let removedCount = 0;

    const movements: DriverMovementLog[] = [];

    normalizedEntries.forEach((entry, productId) => {
      const existing = existingRecords.find(record => record.product_id === productId);
      if (entry.quantity === 0) {
        if (existing) {
          removedCount += 1;
          movements.unshift({
            id: `dm-${Date.now()}-${productId}`,
            driver_id: driverId,
            zone_id: input.zone_id ?? undefined,
            product_id: productId,
            quantity_change: -existing.quantity,
            action: 'inventory_removed',
            details: input.note || 'סנכרון מלאי נהג',
            created_at: now,
            zone: input.zone_id ? this.zones.find(zone => zone.id === input.zone_id) : undefined,
            product: this.products.find(product => product.id === productId)
          });
        }
        return;
      }

      const product = this.products.find(p => p.id === productId);
      const quantityChange = entry.quantity - (existing?.quantity ?? 0);

      const record: DriverInventoryRecord = existing
        ? {
            ...existing,
            quantity: entry.quantity,
            updated_at: now,
            location_id: entry.location_id ?? existing.location_id,
            product: product || existing.product
          }
        : {
            id: `di-${Date.now()}-${productId}`,
            driver_id: driverId,
            product_id: productId,
            quantity: entry.quantity,
            updated_at: now,
            location_id: entry.location_id,
            product
          };

      updatedRecords.push(record);
      updatedCount += 1;

      if (quantityChange !== 0) {
        movements.unshift({
          id: `dm-${Date.now()}-${productId}-${Math.random().toString(16).slice(2, 6)}`,
          driver_id: driverId,
          zone_id: input.zone_id ?? undefined,
          product_id: productId,
          quantity_change: quantityChange,
          action: quantityChange > 0 ? 'inventory_added' : 'inventory_removed',
          details: input.note || 'סנכרון מלאי נהג',
          created_at: now,
          zone: input.zone_id ? this.zones.find(zone => zone.id === input.zone_id) : undefined,
          product
        });
      }
    });

    for (const existing of existingRecords) {
      if (!normalizedEntries.has(existing.product_id)) {
        removedCount += 1;
        movements.unshift({
          id: `dm-${Date.now()}-${existing.product_id}-rm`,
          driver_id: driverId,
          zone_id: input.zone_id ?? undefined,
          product_id: existing.product_id,
          quantity_change: -existing.quantity,
          action: 'inventory_removed',
          details: input.note || 'סנכרון מלאי נהג',
          created_at: now,
          zone: input.zone_id ? this.zones.find(zone => zone.id === input.zone_id) : undefined,
          product: existing.product
        });
      }
    }

    this.driverInventory = [...remainingRecords, ...updatedRecords];
    if (movements.length > 0) {
      this.driverMovements.unshift(...movements);
    }

    return { updated: updatedCount, removed: removedCount };
  }

  // Orders
  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let filtered = [...this.orders];
    
    // Role-based filtering: salespeople can only see their own orders
    if (this.user.role === 'sales') {
      filtered = filtered.filter(order => order.created_by === getUserIdentifier(this.user));
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
    const salespersonId = input.salesperson_id || getUserIdentifier(this.user);
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
      created_by: getUserIdentifier(this.user),
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
    if (this.user.role === 'sales' && order.created_by !== getUserIdentifier(this.user)) {
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
    return this.tasks.filter(task => task.assigned_to === getUserIdentifier(this.user));
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
        driver_id: getUserIdentifier(this.user),
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
      chat.members.includes(getUserIdentifier(this.user))
    );
  }

  async listChannels(): Promise<Channel[]> {
    return this.channels.filter(channel => 
      channel.subscribers.includes(getUserIdentifier(this.user))
    );
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.notifications.filter(notification => 
      notification.recipient_id === getUserIdentifier(this.user)
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async markNotificationRead(id: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].read = true;
    }
  }

  async getRoyalDashboardSnapshot(): Promise<RoyalDashboardSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const ACTIVE_ORDER_STATUSES: Order['status'][] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
    const orders = [...this.orders];
    const outstandingOrders = orders.filter(order => ACTIVE_ORDER_STATUSES.includes(order.status));
    const deliveredToday = orders.filter(order => order.status === 'delivered' && new Date(order.created_at) >= startOfDay);
    const ordersToday = orders.filter(order => new Date(order.created_at) >= startOfDay && order.status !== 'cancelled');

    const revenueToday = deliveredToday.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const averageOrderValue = deliveredToday.length > 0 ? revenueToday / deliveredToday.length : 0;

    const driverStatuses = [...this.driverStatuses];
    const activeDrivers = driverStatuses.filter(status => status.is_online).length;

    const driverZoneMap = new Map<string, string | null>();
    driverStatuses.forEach(status => {
      driverZoneMap.set(status.driver_id, status.current_zone_id ?? null);
    });

    const zonesCoverage: RoyalDashboardZoneCoverage[] = this.zones
      .filter(zone => zone.active !== false)
      .map(zone => {
        const onlineDrivers = driverStatuses.filter(status => status.is_online && status.current_zone_id === zone.id);
        const zoneOutstanding = outstandingOrders.filter(order => {
          if (!order.assigned_driver) return false;
          return driverZoneMap.get(order.assigned_driver) === zone.id;
        });
        let coveragePercent = onlineDrivers.length > 0 ? 100 : 0;
        if (zoneOutstanding.length > 0) {
          coveragePercent = onlineDrivers.length === 0
            ? 0
            : Math.min(100, Math.round((onlineDrivers.length / zoneOutstanding.length) * 100));
        }

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          activeDrivers: onlineDrivers.length,
          outstandingOrders: zoneOutstanding.length,
          coveragePercent,
          color: zone.color
        } as RoyalDashboardZoneCoverage;
      });

    const coveragePercent = zonesCoverage.length > 0
      ? Math.round(
          (zonesCoverage.filter(zone => zone.activeDrivers > 0).length / zonesCoverage.length) * 100
        )
      : 0;

    const metrics: RoyalDashboardMetrics = {
      revenueToday,
      ordersToday: ordersToday.length,
      deliveredToday: deliveredToday.length,
      averageOrderValue,
      pendingOrders: outstandingOrders.length,
      activeDrivers,
      coveragePercent,
      outstandingDeliveries: outstandingOrders.filter(order => order.status !== 'new').length
    };

    const revenueTrend: RoyalDashboardChartPoint[] = [];
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dayStart = new Date(startOfDay);
      dayStart.setDate(startOfDay.getDate() - dayOffset);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayOrders = orders.filter(order => {
        const createdAt = new Date(order.created_at);
        return createdAt >= dayStart && createdAt < dayEnd && order.status === 'delivered';
      });
      const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      revenueTrend.push({
        label: dayStart.toLocaleDateString('he-IL', { weekday: 'short' }),
        value: Number(dayRevenue.toFixed(2))
      });
    }

    const hoursWindow = 12;
    const ordersPerHour: RoyalDashboardChartPoint[] = [];
    const recentOrders = orders.filter(order => new Date(order.created_at) >= new Date(now.getTime() - hoursWindow * 60 * 60 * 1000));
    for (let hour = hoursWindow - 1; hour >= 0; hour--) {
      const bucketStart = new Date(now.getTime() - hour * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
      const count = recentOrders.filter(order => {
        const createdAt = new Date(order.created_at);
        return createdAt >= bucketStart && createdAt < bucketEnd;
      }).length;
      ordersPerHour.push({
        label: bucketStart.toLocaleTimeString('he-IL', { hour: '2-digit' }),
        value: count
      });
    }

    const lowStockAlerts: RoyalDashboardLowStockAlert[] = this.products
      .filter(product => (product.stock_quantity ?? 0) <= 20)
      .slice(0, 8)
      .map(product => ({
        product_id: product.id,
        product_name: product.name,
        location_id: product.warehouse_location || 'central',
        location_name: product.warehouse_location || 'מחסן מרכזי',
        on_hand_quantity: product.stock_quantity ?? 0,
        low_stock_threshold: 20,
        triggered_at: now.toISOString()
      }));

    const restockQueue: RoyalDashboardRestockRequest[] = lowStockAlerts.slice(0, 5).map((alert, index) => ({
      id: `restock-${alert.product_id}-${index}`,
      product_id: alert.product_id,
      product_name: alert.product_name,
      requested_quantity: Math.max(alert.low_stock_threshold - alert.on_hand_quantity, 5),
      status: index === 0 ? 'approved' : 'pending',
      requested_at: new Date(now.getTime() - index * 30 * 60 * 1000).toISOString(),
      to_location_name: alert.location_name
    }));

    const agentOrdersCount = outstandingOrders.reduce<Record<string, number>>((acc, order) => {
      if (!order.assigned_driver) return acc;
      acc[order.assigned_driver] = (acc[order.assigned_driver] || 0) + 1;
      return acc;
    }, {});

    const agents: RoyalDashboardAgent[] = driverStatuses.map(status => ({
      id: status.driver_id,
      name: status.driver_id,
      status: status.is_online ? status.status : 'offline',
      zone: status.current_zone_id
        ? this.zones.find(zone => zone.id === status.current_zone_id)?.name || null
        : null,
      ordersInProgress: agentOrdersCount[status.driver_id] || 0,
      lastUpdated: status.last_updated,
      avatarUrl: undefined
    }));

    agents.sort((a, b) => {
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      if (b.status === 'offline' && a.status !== 'offline') return -1;
      return b.ordersInProgress - a.ordersInProgress;
    });

    return {
      metrics,
      revenueTrend,
      ordersPerHour,
      agents,
      zones: zonesCoverage,
      lowStockAlerts,
      restockQueue,
      generatedAt: now.toISOString()
    };
  }
}

export async function createFrontendDataStore(
  cfg: BootstrapConfig,
  mode: 'real',
  user?: any
): Promise<FrontendDataStore> {
  // Use Supabase for real mode if configured, otherwise fallback to mock
  if ((cfg.adapters.data === 'supabase' || cfg.adapters.data === 'postgres') && import.meta.env.VITE_SUPABASE_URL) {
    const { createSupabaseDataStore } = await import('./supabaseDataStore');

    // For wallet auth, we use the UUID. For telegram auth, we use telegram_id
    // The parameter name is legacy but accepts both UUID and telegram_id
    const userId = user?.id || user?.telegram_id;
    if (!userId) {
      logger.error('Cannot create datastore: missing user ID', new Error('Missing user ID'), { user });
      throw new Error('Cannot create datastore without user ID');
    }

    const store = await createSupabaseDataStore(userId, user?.auth_session, user);
    return attachSubscriptionHelpers(store);
  }

  // Fallback to mock data store for development/demo
  return attachSubscriptionHelpers(new HebrewLogisticsDataStore(user));
}

/**
 * Create a datastore based on adapter selection.
 * Defaults to Supabase to preserve existing behavior.
 */
export async function createDataStore(
  cfg: BootstrapConfig,
  mode: 'real',
  user?: any,
  identityProvider?: () => { walletType: string | null; walletAddress: string | null }
): Promise<FrontendDataStore> {
  const adapter = (cfg.adapters.data || 'supabase') as 'supabase' | 'postgres' | 'sxt';

  // Prefer env flag override (VITE_USE_SXT=true) to force SxT
  const useSxt = (import.meta as any)?.env?.VITE_USE_SXT === 'true';
  const resolvedAdapter = useSxt ? 'sxt' : adapter;

  if (resolvedAdapter === 'sxt') {
    const { createSxTDataStore } = await import('./sxt/sxtDataStore');
    const store = createSxTDataStore(cfg, user, identityProvider) as unknown as DataStore | SxTDataStore;
    return attachSubscriptionHelpers(store);
  }

  // Fallback to existing Supabase/Postgres path
  return createFrontendDataStore(cfg, mode, user);
}
