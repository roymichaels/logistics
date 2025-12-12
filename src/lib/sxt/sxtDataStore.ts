// Scaffold for Space and Time (SxT) data store.
// This is a non-functional placeholder to be filled in during the migration.
// It mirrors the SupabaseDataStore shape while remaining safe to import.

import type {
  BootstrapConfig,
  Business,
  BusinessUser,
  Channel,
  CreateNotificationInput,
  CreateOrderInput,
  DriverAvailabilityStatus,
  DriverInventoryRecord,
  DriverMovementLog,
  DriverStatusRecord,
  GroupChat,
  InventoryAlert,
  InventoryBalanceSummary,
  InventoryLog,
  LocationInventoryBalance,
  Notification,
  Order,
  Product,
  RestockRequest,
  RolePermissions,
  SalesLog,
  Task,
  User,
  Zone
} from '../data/types';
import type { SxTClientConfig } from './client';
import { getSxTClient } from './client';
import * as productsModule from './modules/products';
import * as ordersModule from './modules/orders';
import * as inventoryModule from './modules/inventory';
import * as driversModule from './modules/drivers';
import * as tasksModule from './modules/tasks';
import * as zonesModule from './modules/zones';
import * as notificationsModule from './modules/notifications';
import * as businessModule from './modules/business';
import * as authModule from './modules/auth';

type NotImplemented = never;

export interface SxTDataStore {
  // Core client handle
  client: SxTClientConfig | null;

  // Auth/session (to be replaced by wallet session handling)
  getSession(): Promise<unknown>;
  refreshSession(): Promise<void>;
  signOut(): Promise<void>;
  getUserProfile(userId: string, forceRefresh?: boolean): Promise<User | null>;
  getProfile(): Promise<User | null>;
  refreshProfile?(): Promise<User | null>;

  // Products
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: Partial<Product>): Promise<Product>;
  updateProduct(id: string, patch: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Orders
  listOrders(filter?: Record<string, unknown>): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  listOrderHistory(id: string): Promise<SalesLog[]>;

  // Tasks
  listTasks(filter?: Record<string, unknown>): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: Partial<Task>): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Inventory
  getInventoryBalances(filter?: Record<string, unknown>): Promise<InventoryBalanceSummary[]>;
  getLocationInventoryBalances(filter?: Record<string, unknown>): Promise<LocationInventoryBalance[]>;
  getInventoryAlerts(filter?: Record<string, unknown>): Promise<InventoryAlert[]>;
  getInventoryLogs(filter?: Record<string, unknown>): Promise<InventoryLog[]>;
  createRestockRequest(input: Partial<RestockRequest>): Promise<RestockRequest>;
  approveRestock(id: string, approverId: string): Promise<void>;
  fulfillRestock(id: string, fulfillerId: string): Promise<void>;
  logInventoryEvent(event: Partial<InventoryLog>): Promise<void>;
  transferInventory(input: Record<string, unknown>): Promise<void>;
  driverInventorySync(input: Record<string, unknown>): Promise<DriverInventoryRecord[]>;

  // Drivers
  getDriverStatus(id: string): Promise<DriverStatusRecord | null>;
  listDriverStatuses(filter?: Record<string, unknown>): Promise<DriverStatusRecord[]>;
  updateDriverStatus(id: string, patch: Partial<DriverStatusRecord>): Promise<DriverStatusRecord>;
  logDriverMovement(log: Partial<DriverMovementLog>): Promise<void>;
  setDriverAvailability(id: string, status: DriverAvailabilityStatus): Promise<void>;

  // Zones
  listZones(): Promise<Zone[]>;
  createZone(input: Partial<Zone>): Promise<Zone>;
  updateZone(id: string, patch: Partial<Zone>): Promise<Zone>;
  deleteZone(id: string): Promise<void>;

  // Notifications
  listNotifications(userId: string): Promise<Notification[]>;
  createNotification(input: CreateNotificationInput): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;

  // Chat / Social
  listChannels(): Promise<Channel[]>;
  createChannel(input: Partial<Channel>): Promise<Channel>;
  listGroupChats(): Promise<GroupChat[]>;
  createGroupChat(input: Partial<GroupChat>): Promise<GroupChat>;
  listPosts(filter?: Record<string, unknown>): Promise<unknown[]>;
  createPost(input: Record<string, unknown>): Promise<unknown>;
  likePost(postId: string): Promise<void>;

  // Business & context
  listBusinesses(): Promise<Business[]>;
  createBusiness(input: Partial<Business>): Promise<Business>;
  listBusinessUsers(businessId: string): Promise<BusinessUser[]>;
  setUserRole(userId: string, role: string): Promise<void>;
  getUserBusinessContext(userId: string): Promise<Record<string, unknown> | null>;

  // Analytics
  getOwnerMetrics(): Promise<Record<string, unknown>>;
  getManagerMetrics(): Promise<Record<string, unknown>>;
  getDriverEarnings(driverId: string): Promise<Record<string, unknown>>;

  // KYC
  getKycStatus(userId: string): Promise<Record<string, unknown>>;
  submitKyc(userId: string, payload: Record<string, unknown>): Promise<void>;
  reviewKyc(userId: string, status: string, notes?: string): Promise<void>;

  // Permissions
  getRolePermissions(role: string): Promise<RolePermissions | null>;

  // Subscriptions (placeholder – may be polling-based)
  subscribeToChanges(topic: string, handler: (payload: unknown) => void): () => void;

  // Identity (stub)
  currentIdentity: () => { walletType: string | null; walletAddress: string | null };
}


// Factory returning the current SxT data store facade.
export function createSxTDataStore(
  _config: BootstrapConfig,
  _user?: User,
  identityProvider?: () => { walletType: string | null; walletAddress: string | null }
): SxTDataStore {
  const notImplemented = async (): Promise<NotImplemented> => {
    throw new Error('SxTDataStore method not implemented yet');
  };

  const currentIdentity = () => identityProvider?.() ?? ({ walletType: null, walletAddress: null });

  const buildUserFromIdentity = (): User | null => {
    const id = currentIdentity().walletAddress;
    const walletType = currentIdentity().walletType;
    if (!id) return null;
    return {
      id,
      telegram_id: id,
      username: id,
      name: id,
      role: 'client',
      auth_method: walletType || 'wallet'
    } as unknown as User;
  };

  return {
    client: getSxTClient(),

    getSession: async () => authModule.getCurrentSession(),
    refreshSession: async () => {}, // wallet sessions are static; no-op for now
    signOut: authModule.logout,
    getUserProfile: async (userId: string) => (userId ? buildUserFromIdentity() : null),
    getProfile: async () => buildUserFromIdentity(),
    refreshProfile: async () => buildUserFromIdentity(),

    listProducts: productsModule.listProducts,
    getProduct: productsModule.getProduct,
    createProduct: productsModule.createProduct,
    updateProduct: productsModule.updateProduct,
    deleteProduct: productsModule.deleteProduct,

    listOrders: ordersModule.listOrders,
    getOrder: ordersModule.getOrder,
    createOrder: ordersModule.createOrder,
    updateOrder: ordersModule.updateOrder,
    deleteOrder: ordersModule.deleteOrder,
    listOrderHistory: ordersModule.listOrderHistory,

    listTasks: tasksModule.listTasks,
    getTask: tasksModule.getTask,
    createTask: tasksModule.createTask,
    updateTask: tasksModule.updateTask,
    deleteTask: tasksModule.deleteTask,

    getInventoryBalances: inventoryModule.getInventoryBalances,
    getLocationInventoryBalances: notImplemented,
    getInventoryAlerts: notImplemented,
    getInventoryLogs: inventoryModule.getInventoryMovements,
    createRestockRequest: inventoryModule.createRestockRequest,
    approveRestock: inventoryModule.approveRestock,
    fulfillRestock: inventoryModule.fulfillRestock,
    logInventoryEvent: inventoryModule.createInventoryMovement,
    transferInventory: notImplemented,
    driverInventorySync: notImplemented,

    getDriverStatus: driversModule.getDriverStatus,
    listDriverStatuses: driversModule.listDriverStatuses,
    updateDriverStatus: driversModule.updateDriverStatus,
    logDriverMovement: driversModule.logDriverMovement,
    setDriverAvailability: notImplemented,

    listZones: zonesModule.listZones,
    createZone: zonesModule.createZone,
    updateZone: zonesModule.updateZone,
    deleteZone: zonesModule.deleteZone,

    listNotifications: notificationsModule.listNotifications,
    createNotification: notificationsModule.createNotification,
    markNotificationRead: notificationsModule.markNotificationRead,

    // --- Minimal chat/social stubs to keep UI functional in SxT mode ---
    listChannels: async () => [],
    createChannel: async (_input: any) => ({ id: crypto.randomUUID?.() ?? `${Date.now()}` }),
    listGroupChats: async () => [],
    createGroupChat: async (_input: any) => ({ id: crypto.randomUUID?.() ?? `${Date.now()}` }),
    listMessages: async (_chatId: string, _limit?: number) => [],
    sendMessage: async (_chatId: string, _content: string) => ({ id: crypto.randomUUID?.() ?? `${Date.now()}` }),
    editMessage: async (_messageId: string, _content: string) => {},
    listPosts: async () => [],
    createPost: async (_input: any) => ({ id: crypto.randomUUID?.() ?? `${Date.now()}` }),
    likePost: async (_postId: string) => {},
    listAllUsersForMessaging: async () => [],
    listDirectMessageRooms: async () => [],
    markDirectMessageAsRead: async (_roomId: string) => {},
    updateUserPresence: async (_status: string) => {},
    getUserByTelegramId: async (_tgId: string) => null,

    listBusinesses: businessModule.listBusinesses,
    createBusiness: businessModule.createBusiness,
    listBusinessUsers: businessModule.listBusinessUsers,
    setUserRole: businessModule.setUserRole,
    getUserBusinessContext: notImplemented,

    getOwnerMetrics: notImplemented,
    getManagerMetrics: notImplemented,
    getDriverEarnings: notImplemented,

    getKycStatus: notImplemented,
    submitKyc: notImplemented,
    reviewKyc: notImplemented,

    getRolePermissions: notImplemented,

    subscribeToChanges: () => () => {},

    currentIdentity: () => identityProvider?.() ?? ({ walletType: null, walletAddress: null })
  };
}
