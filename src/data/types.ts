// ============================================================================
// Base Type Definitions
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

// Database Row Types for Query Results
export type DatabaseRow = Record<string, unknown>;

// GeoJSON Types
export interface GeoJSONCoordinate {
  lat: number;
  lng: number;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [longitude, latitude]
}

// Zone Metadata
export interface ZoneMetadata {
  area_km2?: number;
  population?: number;
  average_delivery_time_minutes?: number;
  peak_hours?: string[];
  notes?: string;
  custom_fields?: Record<string, string | number | boolean>;
}

// Zone Changes for Audit Log
export interface ZoneChanges {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

// Business Address
export interface BusinessAddress {
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Business Contact Info
export interface BusinessContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  support_email?: string;
  support_phone?: string;
}

// Business Settings
export interface BusinessSettings {
  timezone?: string;
  language?: string;
  date_format?: string;
  currency_symbol?: string;
  tax_rate?: number;
  delivery_fee?: number;
  minimum_order_amount?: number;
  max_delivery_distance_km?: number;
  operating_hours?: {
    day: string;
    open: string;
    close: string;
  }[];
  features?: {
    enable_delivery?: boolean;
    enable_pickup?: boolean;
    enable_scheduling?: boolean;
    enable_tracking?: boolean;
  };
}

// Business User Permissions
export interface BusinessUserPermissions {
  can_create_orders?: boolean;
  can_edit_orders?: boolean;
  can_delete_orders?: boolean;
  can_assign_drivers?: boolean;
  can_manage_inventory?: boolean;
  can_view_reports?: boolean;
  can_manage_users?: boolean;
  can_manage_settings?: boolean;
  custom_permissions?: Record<string, boolean>;
}

// Realtime Payload
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: string[] | null;
}

// ============================================================================
// Domain Models
// ============================================================================

export interface User {
  id: string;
  telegram_id: string;
  role: 'user' | 'infrastructure_owner' | 'business_owner' | 'manager' | 'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service';
  name?: string;
  username?: string;
  photo_url?: string;
  department?: string;
  phone?: string;
  business_id?: string;
  last_active?: string;
}

export type UserRegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationApproval {
  action: 'submitted' | 'updated' | 'approved' | 'rejected';
  by: string;
  at: string;
  notes?: string | null;
  assigned_role?: User['role'] | null;
}

export interface UserRegistration {
  telegram_id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  department?: string | null;
  phone?: string | null;
  requested_role: User['role'];
  assigned_role?: User['role'] | null;
  status: UserRegistrationStatus;
  approval_history: RegistrationApproval[];
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  created_at: string;
  updated_at: string;
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

export interface LocationInventoryBalance {
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  pending_restock_quantity: number;
  location?: InventoryLocation;
}

export interface DriverInventoryBalance {
  driver_id: string;
  product_id: string;
  quantity: number;
  location_id?: string | null;
  zone_id?: string | null;
  updated_at?: string;
}

export interface InventoryBalanceSummary {
  product_id: string;
  product?: Product;
  total_on_hand: number;
  total_reserved: number;
  total_damaged: number;
  total_driver_quantity: number;
  locations: LocationInventoryBalance[];
  drivers: DriverInventoryBalance[];
  open_restock_requests: RestockRequest[];
  last_updated?: string;
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

export interface DriverInventorySyncEntry {
  product_id: string;
  quantity: number;
  location_id?: string | null;
}

export interface DriverInventorySyncInput {
  driver_id?: string;
  entries: DriverInventorySyncEntry[];
  note?: string;
  zone_id?: string | null;
}

export interface DriverInventorySyncResult {
  updated: number;
  removed: number;
}

export interface Zone {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  city?: string | null;
  region?: string | null;
  polygon?: GeoJSONPolygon | null;
  active: boolean;
  business_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  metadata?: ZoneMetadata | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateZoneInput {
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  city?: string | null;
  region?: string | null;
  polygon?: GeoJSONPolygon | null;
  business_id?: string | null;
  metadata?: ZoneMetadata | null;
  active?: boolean;
}

export interface UpdateZoneInput {
  name?: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  city?: string | null;
  region?: string | null;
  polygon?: GeoJSONPolygon | null;
  active?: boolean;
  metadata?: ZoneMetadata | null;
}

export interface ZoneAuditLog {
  id: string;
  zone_id: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  changed_by: string;
  changes: ZoneChanges;
  created_at: string;
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

export type RestockRequestStatus = 'pending' | 'approved' | 'in_transit' | 'fulfilled' | 'rejected';

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
  metadata?: ZoneMetadata | null;
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

export interface SalesLogInput {
  product_id: string;
  location_id: string;
  quantity: number;
  total_amount: number;
  reference_id?: string | null;
  sold_at?: string;
  notes?: string | null;
}

export interface InventoryTransferInput {
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes?: string;
  reference_id?: string | null;
}

export interface DriverInventoryTransferInput {
  product_id: string;
  driver_id: string;
  quantity: number;
  notes?: string;
}

export interface DriverInventoryAdjustmentInput {
  driver_id: string;
  product_id: string;
  quantity_change: number;
  reason: string;
  notes?: string;
  zone_id?: string | null;
}

export interface RestockRequestInput {
  product_id: string;
  requested_quantity: number;
  to_location_id: string;
  from_location_id?: string | null;
  notes?: string;
}

export interface RestockApprovalInput {
  approved_quantity: number;
  from_location_id: string;
  notes?: string;
}

export interface RestockFulfillmentInput {
  fulfilled_quantity: number;
  notes?: string;
  reference_id?: string | null;
}

export interface DriverAvailabilitySummary {
  driver: DriverStatusRecord;
  zones: DriverZoneAssignment[];
  inventory: DriverInventoryRecord[];
  total_inventory: number;
  missing_items: { product_id: string; missing: number }[];
  matches: boolean;
  score: number;
}

export interface ZoneCoverageSnapshot {
  zone: Zone;
  onlineDrivers: DriverStatusRecord[];
  idleDrivers: DriverStatusRecord[];
  assignments: DriverZoneAssignment[];
  inventory: DriverInventoryRecord[];
  outstandingOrders: Order[];
}

export interface DispatchAssignmentResult {
  success: boolean;
  driverId?: string;
  zoneId?: string | null;
  candidateScore?: number;
  reason?: 'no_zone' | 'no_candidates' | 'permission_denied' | 'error';
  notificationId?: string;
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
  assigned_driver_id?: string;
  assigned_driver?: string;
  assigned_at?: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_proof_url?: string;
  customer_rating?: number;
  customer_feedback?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  created_by: string;
  salesperson_id?: string;
  entry_mode?: OrderEntryMode;
  raw_order_text?: string;
  created_at: string;
  updated_at: string;
  eta?: string;
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
  type: 'department' | 'project' | 'general' | 'encrypted';
  department?: string;
  members: string[];
  telegram_chat_id?: string;
  description?: string;
  business_id?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'announcements' | 'updates' | 'alerts';
  telegram_channel_id?: string;
  description?: string;
  subscribers: string[];
  business_id?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'order_assigned' | 'order_completed' | 'low_stock' | 'restock_approved' | 'user_registered' | 'system_alert';
  recipient_id: string;
  read: boolean;
  read_at?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_telegram_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'notification';
  sent_at: string;
  edited_at?: string;
  is_deleted: boolean;
  reply_to_message_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationInput {
  recipient_id: string;
  title: string;
  message: string;
  type?: Notification['type'];
  action_url?: string | null;
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
  // Supabase client access (for direct database operations)
  supabase?: SupabaseClient;

  // Auth & Profile
  getProfile(): Promise<User>;
  getCurrentRole?(): Promise<User['role'] | null>;
  updateProfile?(updates: Partial<User>): Promise<void>;
  clearUserCache?(): void;
  
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
  getInventorySummary?(productId: string): Promise<InventoryBalanceSummary>;
  listRestockRequests?(filters?: {
    status?: RestockRequestStatus | 'all';
    onlyMine?: boolean;
    product_id?: string;
    location_id?: string;
  }): Promise<RestockRequest[]>;
  submitRestockRequest?(input: RestockRequestInput): Promise<{ id: string }>;
  approveRestockRequest?(id: string, input: RestockApprovalInput): Promise<void>;
  fulfillRestockRequest?(id: string, input: RestockFulfillmentInput): Promise<void>;
  rejectRestockRequest?(id: string, input?: { notes?: string }): Promise<void>;
  transferInventory?(input: InventoryTransferInput): Promise<void>;
  transferInventoryToDriver?(input: DriverInventoryTransferInput): Promise<void>;
  adjustDriverInventory?(input: DriverInventoryAdjustmentInput): Promise<void>;
  listInventoryLogs?(filters?: {
    product_id?: string;
    location_id?: string;
    limit?: number;
  }): Promise<InventoryLog[]>;
  listSalesLogs?(filters?: { product_id?: string; location_id?: string; limit?: number }): Promise<SalesLog[]>;
  recordSale?(input: SalesLogInput): Promise<{ id: string }>;
  getLowStockAlerts?(filters?: { location_id?: string }): Promise<InventoryAlert[]>;
  getRolePermissions?(): Promise<RolePermissions>;

  // Zones & Dispatch
  listZones?(filters?: { business_id?: string; city?: string; region?: string; includeDeleted?: boolean }): Promise<Zone[]>;
  getZone?(id: string): Promise<Zone | null>;
  createZone?(input: CreateZoneInput): Promise<{ id: string }>;
  updateZone?(id: string, input: UpdateZoneInput): Promise<void>;
  deleteZone?(id: string, softDelete?: boolean): Promise<void>;
  restoreZone?(id: string): Promise<void>;
  getZoneAuditLogs?(zoneId: string, limit?: number): Promise<ZoneAuditLog[]>;
  listDriverZones?(filters?: { driver_id?: string; zone_id?: string; activeOnly?: boolean }): Promise<DriverZoneAssignment[]>;
  assignDriverToZone?(input: { zone_id: string; driver_id?: string; active?: boolean }): Promise<void>;
  unassignDriverFromZone?(input: { zone_id: string; driver_id?: string }): Promise<void>;
  updateDriverStatus?(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void>;
  toggleDriverOnline?(input: {
    driver_id?: string;
    zone_id?: string | null;
    is_online: boolean;
    status?: DriverAvailabilityStatus;
    note?: string;
  }): Promise<void>;
  setDriverOnline?(input?: { driver_id?: string; zone_id?: string | null; status?: DriverAvailabilityStatus; note?: string }): Promise<void>;
  setDriverOffline?(input?: { driver_id?: string; note?: string }): Promise<void>;
  getDriverStatus?(driver_id?: string): Promise<DriverStatusRecord | null>;
  listDriverStatuses?(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]>;
  getZoneCoverage?(filters?: { zone_id?: string; includeOrders?: boolean; onlyActive?: boolean }): Promise<ZoneCoverageSnapshot[]>;
  syncDriverInventory?(input: DriverInventorySyncInput): Promise<DriverInventorySyncResult>;
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
  listMessages?(chatId: string, limit?: number): Promise<Message[]>;
  sendMessage?(chatId: string, content: string, messageType?: Message['message_type']): Promise<{ id: string }>;
  editMessage?(messageId: string, content: string): Promise<void>;
  deleteMessage?(messageId: string): Promise<void>;

  // Notifications
  getNotifications?(): Promise<Notification[]>;
  listNotifications?(filters?: { limit?: number; unreadOnly?: boolean }): Promise<Notification[]>;
  markNotificationRead?(id: string): Promise<void>;
  markNotificationAsRead?(id: string): Promise<void>;
  createNotification?(input: CreateNotificationInput): Promise<{ id: string }>;

  // Royal intelligence
  getRoyalDashboardSnapshot?(): Promise<RoyalDashboardSnapshot>;

  // Business Management
  listBusinesses?(): Promise<Business[]>;
  getBusiness?(id: string): Promise<Business | null>;
  createBusiness?(input: { name: string; name_hebrew: string; business_type: string; order_number_prefix: string; default_currency: 'ILS' | 'USD' | 'EUR'; primary_color: string; secondary_color: string }): Promise<Business>;
  listBusinessUsers?(filters?: { business_id?: string; user_id?: string; role?: string; active_only?: boolean }): Promise<BusinessUser[]>;
  assignUserToBusiness?(input: { business_id: string; user_id: string; role: Exclude<User['role'], 'infrastructure_owner'>; is_primary?: boolean; ownership_percentage?: number; commission_percentage?: number }): Promise<{ id: string }>;
  updateBusinessUserRole?(business_id: string, user_id: string, role: Exclude<User['role'], 'infrastructure_owner'>): Promise<void>;
  updateBusinessUserOwnership?(business_id: string, user_id: string, ownership_percentage: number): Promise<void>;
  removeUserFromBusiness?(business_id: string, user_id: string): Promise<void>;
  listAllUsers?(): Promise<User[]>;

  // Business Types
  listBusinessTypes?(): Promise<BusinessType[]>;
  getBusinessType?(id: string): Promise<BusinessType | null>;
  createBusinessType?(input: Omit<BusinessType, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<{ id: string }>;
  updateBusinessType?(id: string, updates: Partial<BusinessType>): Promise<void>;
  deleteBusinessType?(id: string): Promise<void>;

  // Business Context Management
  getUserBusinesses?(): Promise<UserBusinessAccess[]>;
  getActiveBusinessContext?(): Promise<UserBusinessContext | null>;
  setActiveBusinessContext?(business_id: string): Promise<void>;

  // Real-time subscriptions
  subscribeToChanges?(table: string, callback: (payload: RealtimePayload) => void): () => void;

  // Social Media Features
  getUserProfile?(user_id?: string): Promise<UserProfile | null>;
  updateUserProfile?(updates: UpdateProfileInput): Promise<void>;
  createPost?(input: CreatePostInput): Promise<{ id: string }>;
  deletePost?(post_id: string): Promise<void>;
  getPost?(post_id: string): Promise<Post | null>;
  getFeed?(filters?: FeedFilters): Promise<Post[]>;
  getUserPosts?(user_id: string, limit?: number): Promise<Post[]>;
  likePost?(post_id: string): Promise<void>;
  unlikePost?(post_id: string): Promise<void>;
  repostPost?(post_id: string, comment?: string): Promise<{ id: string }>;
  unrepostPost?(post_id: string): Promise<void>;
  createComment?(input: CreateCommentInput): Promise<{ id: string }>;
  deleteComment?(comment_id: string): Promise<void>;
  getPostComments?(post_id: string, limit?: number): Promise<PostComment[]>;
  followUser?(user_id: string): Promise<void>;
  unfollowUser?(user_id: string): Promise<void>;
  getFollowers?(user_id?: string, limit?: number): Promise<User[]>;
  getFollowing?(user_id?: string, limit?: number): Promise<User[]>;
  isFollowing?(user_id: string): Promise<boolean>;
  searchUsers?(query: string, limit?: number): Promise<User[]>;
  getTrendingTopics?(limit?: number): Promise<TrendingTopic[]>;
  searchPosts?(query: string, filters?: FeedFilters): Promise<Post[]>;
  bookmarkPost?(post_id: string): Promise<void>;
  unbookmarkPost?(post_id: string): Promise<void>;
  getBookmarkedPosts?(limit?: number): Promise<Post[]>;
  blockUser?(user_id: string): Promise<void>;
  unblockUser?(user_id: string): Promise<void>;
  muteUser?(user_id: string): Promise<void>;
  unmuteUser?(user_id: string): Promise<void>;
  getBlockedUsers?(): Promise<User[]>;
  getMutedUsers?(): Promise<User[]>;
}

export interface RoyalDashboardMetrics {
  revenueToday: number;
  ordersToday: number;
  deliveredToday: number;
  averageOrderValue: number;
  pendingOrders: number;
  activeDrivers: number;
  coveragePercent: number;
  outstandingDeliveries: number;
}

export interface RoyalDashboardChartPoint {
  label: string;
  value: number;
}

export interface RoyalDashboardAgent {
  id: string;
  name: string;
  status: string;
  zone?: string | null;
  ordersInProgress: number;
  lastUpdated: string;
  avatarUrl?: string | null;
}

export interface RoyalDashboardZoneCoverage {
  zoneId: string;
  zoneName: string;
  activeDrivers: number;
  outstandingOrders: number;
  coveragePercent: number;
  color?: string | null;
}

export interface RoyalDashboardLowStockAlert {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  on_hand_quantity: number;
  low_stock_threshold: number;
  triggered_at: string;
}

export interface RoyalDashboardRestockRequest {
  id: string;
  product_id: string;
  product_name?: string | null;
  requested_quantity: number;
  status: string;
  requested_at: string;
  to_location_name?: string | null;
}

export interface RoyalDashboardSnapshot {
  metrics: RoyalDashboardMetrics;
  revenueTrend: RoyalDashboardChartPoint[];
  ordersPerHour: RoyalDashboardChartPoint[];
  agents: RoyalDashboardAgent[];
  zones: RoyalDashboardZoneCoverage[];
  lowStockAlerts: RoyalDashboardLowStockAlert[];
  restockQueue: RoyalDashboardRestockRequest[];
  generatedAt: string;
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

export interface BusinessType {
  id: string;
  type_value: string;
  label_hebrew: string;
  label_english: string;
  icon?: string;
  description?: string;
  is_system_default: boolean;
  active: boolean;
  display_order: number;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  name_hebrew: string;
  business_type: string;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  default_currency: 'ILS' | 'USD' | 'EUR';
  order_number_prefix: string;
  order_number_sequence: number;
  address?: BusinessAddress | null;
  contact_info?: BusinessContactInfo | null;
  business_settings?: BusinessSettings | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUser {
  id: string;
  business_id: string;
  user_id: string;
  role: Exclude<User['role'], 'infrastructure_owner'>;
  ownership_percentage?: number;
  commission_percentage?: number;
  permissions?: BusinessUserPermissions | null;
  is_primary: boolean;
  active: boolean;
  assigned_at: string;
  assigned_by?: string | null;
  updated_at?: string;
  user?: User;
  business?: Business;
}

export interface UserBusinessContext {
  id: string;
  user_id: string;
  active_business_id: string | null;
  last_switched_at: string;
  session_metadata?: Record<string, any>;
}

export interface UserBusinessAccess {
  business_id: string;
  business_name: string;
  business_role: Exclude<User['role'], 'infrastructure_owner'> | 'infrastructure_owner';
  ownership_pct: number;
  is_primary: boolean;
}

export type DriverApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'deactivated';

export type DriverVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type DocumentType =
  | 'drivers_license'
  | 'vehicle_registration'
  | 'insurance'
  | 'background_check'
  | 'profile_photo'
  | 'vehicle_photo'
  | 'bank_account';

export type DriverServiceTier = 'standard' | 'premium' | 'platinum';

export interface DriverProfile {
  id: string;
  user_id: string;
  application_status: DriverApplicationStatus;
  verification_status: DriverVerificationStatus;
  service_tier: DriverServiceTier;
  approved_at?: string;
  approved_by?: string;
  date_of_birth?: string;
  national_id_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_plate?: string;
  vehicle_color?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_branch?: string;
  tax_id?: string;
  max_delivery_distance_km?: number;
  min_order_value?: number;
  preferred_payment_method?: string;
  accepts_cash_orders?: boolean;
  total_deliveries: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  average_rating: number;
  acceptance_rate: number;
  completion_rate: number;
  on_time_rate: number;
  is_active: boolean;
  is_online: boolean;
  last_online_at?: string;
  current_latitude?: number;
  current_longitude?: number;
  location_updated_at?: string;
  max_concurrent_orders: number;
  current_order_count: number;
  notes?: string;
  rejection_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DriverApplication {
  id: string;
  user_id: string;
  application_data: Record<string, any>;
  status: DriverApplicationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverDocument {
  id: string;
  driver_profile_id: string;
  document_type: DocumentType;
  document_url: string;
  document_number?: string;
  verification_status: DriverVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  issue_date?: string;
  expiry_date?: string;
  uploaded_at: string;
  updated_at: string;
}

export interface DriverEarning {
  id: string;
  driver_profile_id: string;
  order_id: string;
  business_id: string;
  base_fee: number;
  distance_fee: number;
  time_fee: number;
  surge_fee: number;
  tip_amount: number;
  bonus_amount: number;
  total_earnings: number;
  platform_fee: number;
  net_earnings: number;
  payout_id?: string;
  is_paid: boolean;
  paid_at?: string;
  distance_km?: number;
  duration_minutes?: number;
  earned_at: string;
  created_at: string;
}

export interface OrderMarketplace {
  id: string;
  order_id: string;
  business_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  estimated_distance_km?: number;
  delivery_fee: number;
  driver_earnings: number;
  broadcast_radius_km?: number;
  max_driver_count?: number;
  is_active: boolean;
  assigned_driver_id?: string;
  assigned_at?: string;
  expires_at?: string;
  broadcasted_at: string;
  created_at: string;
}

// ========================================
// TWITTER-STYLE SOCIAL MEDIA TYPES
// ========================================

export interface UserProfile {
  id: string;
  user_id: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
  is_verified: boolean;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export type PostVisibility = 'public' | 'private' | 'followers' | 'business';

export interface Post {
  id: string;
  user_id: string;
  business_id?: string;
  content: string;
  visibility: PostVisibility;
  reply_to_post_id?: string;
  repost_of_post_id?: string;
  is_reply: boolean;
  is_repost: boolean;
  likes_count: number;
  reposts_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user?: User;
  media?: PostMedia[];
  hashtags?: Hashtag[];
  mentions?: UserMention[];
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostRepost {
  id: string;
  post_id: string;
  user_id: string;
  comment?: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user?: User;
  replies?: PostComment[];
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Hashtag {
  id: string;
  tag: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostHashtag {
  id: string;
  post_id: string;
  hashtag_id: string;
  created_at: string;
}

export interface UserMention {
  id: string;
  post_id: string;
  mentioned_user_id: string;
  mentioning_user_id: string;
  created_at: string;
}

export interface TrendingTopic {
  id: string;
  hashtag_id: string;
  posts_count: number;
  engagement_score: number;
  trend_date: string;
  created_at: string;
  hashtag?: Hashtag;
}

export type MediaType = 'image' | 'video' | 'gif';

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  media_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  display_order: number;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserMute {
  id: string;
  muter_id: string;
  muted_id: string;
  created_at: string;
}

export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CreatePostInput {
  content: string;
  visibility?: PostVisibility;
  reply_to_post_id?: string;
  business_id?: string;
  media?: Array<{ media_type: MediaType; media_url: string; thumbnail_url?: string }>;
}

export interface CreateCommentInput {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface UpdateProfileInput {
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  banner_url?: string;
  is_private?: boolean;
}

export interface FeedFilters {
  user_id?: string;
  following_only?: boolean;
  business_id?: string;
  hashtag?: string;
  limit?: number;
  offset?: number;
}