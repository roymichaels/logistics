import { RealtimeChannel, createClient } from '@supabase/supabase-js';
import { getSupabase, loadConfig } from './supabaseClient';
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
  InventoryRecord,
  DriverInventoryRecord,
  DriverInventorySyncInput,
  DriverInventorySyncResult,
  RestockRequest,
  RestockRequestInput,
  RestockApprovalInput,
  RestockFulfillmentInput,
  InventoryLog,
  InventoryAlert,
  InventoryLocation,
  InventoryBalanceSummary,
  LocationInventoryBalance,
  InventoryTransferInput,
  DriverInventoryTransferInput,
  DriverInventoryAdjustmentInput,
  RolePermissions,
  RestockRequestStatus,
  InventoryLogType,
  SalesLog,
  SalesLogInput,
  CreateOrderInput,
  Zone,
  CreateZoneInput,
  UpdateZoneInput,
  ZoneAuditLog,
  DriverZoneAssignment,
  DriverStatusRecord,
  DriverMovementLog,
  DriverAvailabilityStatus,
  DriverMovementAction,
  ZoneCoverageSnapshot,
  CreateNotificationInput,
  UserRegistration,
  UserRegistrationStatus,
  RegistrationApproval,
  RoyalDashboardSnapshot,
  RoyalDashboardAgent,
  RoyalDashboardZoneCoverage,
  RoyalDashboardLowStockAlert,
  RoyalDashboardRestockRequest,
  RoyalDashboardChartPoint,
  RoyalDashboardMetrics,
  UserBusinessContext,
  UserBusinessAccess,
  BusinessUser,
  BusinessType,
  Business
} from '../data/types';

let supabaseInstance: any = null;
let isInitializingSupabase = false;

function getSupabaseInstance() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (isInitializingSupabase) {
    console.warn('⚠️ Supabase client initialization in progress');
    return null;
  }

  isInitializingSupabase = true;
  try {
    supabaseInstance = getSupabase();
    isInitializingSupabase = false;
    return supabaseInstance;
  } catch (error) {
    isInitializingSupabase = false;
    console.warn('⚠️ Supabase client not yet available:', error);
    return null;
  }
}

const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') {
      return undefined;
    }

    const instance = getSupabaseInstance();
    if (!instance) {
      console.warn('⚠️ Supabase client not yet initialized, property:', prop);
      return undefined;
    }

    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

export { supabase };

export interface SupabaseAuthSessionPayload {
  access_token: string;
  refresh_token: string;
  expires_in?: number | null;
  expires_at?: number | null;
  token_type?: string | null;
}

const VALID_ROLES: User['role'][] = [
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
];

export interface UpsertUserRegistrationInput {
  telegram_id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  department?: string | null;
  phone?: string | null;
  requested_role?: User['role'];
}

export interface ApproveUserRegistrationInput {
  approved_by: string;
  assigned_role: User['role'];
  notes?: string | null;
}

export interface UpdateUserRegistrationRoleInput {
  assigned_role: User['role'];
  updated_by: string;
  notes?: string | null;
}

function normalizeRole(role?: string | null): User['role'] {
  if (role && (VALID_ROLES as string[]).includes(role)) {
    return role as User['role'];
  }
  return 'manager';
}

function sanitizeValue<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function normalizeHistory(history: RegistrationApproval[] | null | undefined): RegistrationApproval[] {
  if (!Array.isArray(history)) return [];
  return history.map((entry) => ({
    action: entry.action,
    by: entry.by,
    at: entry.at,
    notes: entry.notes ?? null,
    assigned_role: entry.assigned_role ?? null
  }));
}

function appendHistory(
  history: RegistrationApproval[],
  entry: RegistrationApproval
): RegistrationApproval[] {
  return [...history, entry];
}

async function upsertUserProfileFromRegistration(input: UpsertUserRegistrationInput) {
  const fullName = [input.first_name, input.last_name].filter(Boolean).join(' ').trim();
  const profileUpdate = {
    name: fullName || input.first_name,
    username: sanitizeValue(input.username),
    photo_url: sanitizeValue(input.photo_url),
    department: sanitizeValue(input.department),
    phone: sanitizeValue(input.phone),
    updated_at: new Date().toISOString()
  };

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('telegram_id', input.telegram_id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing?.telegram_id) {
    const { error: updateError } = await supabase
      .from('users')
      .update(profileUpdate)
      .eq('telegram_id', input.telegram_id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase.from('users').insert({
      telegram_id: input.telegram_id,
      role: 'owner',
      ...profileUpdate
    });

    if (insertError) throw insertError;
  }
}

async function updateUserRoleAssignment(telegramId: string, role: User['role']) {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingUser) {
    // Update existing user
    const { error } = await supabase
      .from('users')
      .update({ role, updated_at: now })
      .eq('telegram_id', telegramId);

    if (error) throw error;
  } else {
    // Create new user from registration data
    const registration = await fetchUserRegistrationRecord(telegramId);
    if (!registration) {
      throw new Error('Cannot create user: registration not found');
    }

    const { error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: registration.username || null,
        name: `${registration.first_name}${registration.last_name ? ' ' + registration.last_name : ''}`,
        role: role,
        phone: registration.phone || null,
        active: true,
        created_at: now,
        updated_at: now
      });

    if (error) throw error;
  }
}

export async function fetchUserRegistrationRecord(telegramId: string): Promise<UserRegistration | null> {
  const { data, error } = await supabase
    .from('user_registrations')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    ...data,
    approval_history: normalizeHistory(data.approval_history as RegistrationApproval[] | null)
  } as UserRegistration;
}

export async function listUserRegistrationRecords(filters?: {
  status?: UserRegistrationStatus;
}): Promise<UserRegistration[]> {
  // First, try to get from user_registrations table
  let query = supabase
    .from('user_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data: registrationData, error: regError } = await query;

  // If user_registrations query succeeds and has data, use it
  if (!regError && registrationData && registrationData.length > 0) {
    return registrationData.map((row) => ({
      ...row,
      approval_history: normalizeHistory(row.approval_history as RegistrationApproval[] | null)
    })) as UserRegistration[];
  }

  // Fallback: fetch from users table and transform to UserRegistration format
  console.log('📊 Fetching users from users table as fallback');
  let usersQuery = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  // Map registration_status to status filter
  if (filters?.status) {
    usersQuery = usersQuery.eq('registration_status', filters.status);
  }

  const { data: usersData, error: usersError } = await usersQuery;

  if (usersError) throw usersError;

  // Transform users to UserRegistration format
  return (usersData ?? []).map((user) => ({
    telegram_id: user.telegram_id,
    first_name: user.first_name || user.name?.split(' ')[0] || 'משתמש',
    last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || null,
    username: user.username,
    photo_url: user.photo_url || null,
    department: user.department || null,
    phone: user.phone || null,
    requested_role: user.requested_role || user.role,
    assigned_role: user.assigned_role || user.role,
    status: user.registration_status || 'pending',
    approval_history: normalizeHistory(user.approval_history as RegistrationApproval[] | null),
    created_at: user.created_at,
    updated_at: user.updated_at,
    approved_by: user.approved_by || null,
    approved_at: user.approved_at || null,
    approval_notes: user.approval_notes || null
  })) as UserRegistration[];
}

export async function upsertUserRegistrationRecord(
  input: UpsertUserRegistrationInput
): Promise<UserRegistration> {
  const telegramId = input.telegram_id;
  const existing = await fetchUserRegistrationRecord(telegramId);
  const requestedRole = normalizeRole(input.requested_role);
  const now = new Date().toISOString();

  await upsertUserProfileFromRegistration(input);

  const history = normalizeHistory(existing?.approval_history);
  let updatedHistory = history;

  if (!existing) {
    updatedHistory = appendHistory(history, {
      action: 'submitted',
      by: telegramId,
      at: now,
      notes: `בקשת תפקיד: ${requestedRole}`,
      assigned_role: null
    });
  } else if (existing.requested_role !== requestedRole) {
    updatedHistory = appendHistory(history, {
      action: 'updated',
      by: telegramId,
      at: now,
      notes: `עודכן תפקיד מבוקש ל-${requestedRole}`,
      assigned_role: existing.assigned_role ?? null
    });
  }

  const payload = {
    telegram_id: telegramId,
    first_name: input.first_name,
    last_name: sanitizeValue(input.last_name),
    username: sanitizeValue(input.username),
    photo_url: sanitizeValue(input.photo_url),
    department: sanitizeValue(input.department),
    phone: sanitizeValue(input.phone),
    requested_role: requestedRole,
    approval_history: updatedHistory,
    updated_at: now
  };

  if (existing) {
    const { data, error } = await supabase
      .from('user_registrations')
      .update(payload)
      .eq('telegram_id', telegramId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      ...data,
      approval_history: normalizeHistory(data.approval_history as RegistrationApproval[] | null)
    } as UserRegistration;
  }

  const { data, error } = await supabase
    .from('user_registrations')
    .insert({
      ...payload,
      status: 'pending',
      created_at: now
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    ...data,
    approval_history: normalizeHistory(data.approval_history as RegistrationApproval[] | null)
  } as UserRegistration;
}

export async function approveUserRegistrationRecord(
  telegramId: string,
  input: ApproveUserRegistrationInput
): Promise<UserRegistration> {
  // Try to find in user_registrations first
  const registration = await fetchUserRegistrationRecord(telegramId);

  // If not in user_registrations, check users table directly
  if (!registration) {
    console.log('📊 Registration not found in user_registrations, checking users table');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (userError || !userData) {
      throw new Error('User not found');
    }
  }

  const now = new Date().toISOString();
  const assignedRole = normalizeRole(input.assigned_role);

  // Update in user_registrations if exists
  if (registration) {
    const history = appendHistory(normalizeHistory(registration.approval_history), {
      action: 'approved',
      by: input.approved_by,
      at: now,
      notes: input.notes ?? null,
      assigned_role: assignedRole
    });

    const { error } = await supabase
      .from('user_registrations')
      .update({
        status: 'approved',
        approved_by: input.approved_by,
        approved_at: now,
        approval_notes: input.notes ?? null,
        assigned_role: assignedRole,
        approval_history: history,
        updated_at: now
      })
      .eq('telegram_id', telegramId);

    if (error) console.error('Failed to update user_registrations:', error);
  }

  // ALWAYS update the users table (this is the main table)
  await updateUserRoleAssignment(telegramId, assignedRole);

  // Also update registration_status in users table
  const { error: statusError } = await supabase
    .from('users')
    .update({
      registration_status: 'approved',
      approved_by: input.approved_by,
      approved_at: now,
      approval_notes: input.notes ?? null,
      assigned_role: assignedRole,
      role: assignedRole,
      updated_at: now
    })
    .eq('telegram_id', telegramId);

  if (statusError) throw statusError;

  // Fetch the updated user to return
  const { data: updatedUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (fetchError) throw fetchError;

  // Transform to UserRegistration format
  return {
    telegram_id: updatedUser.telegram_id,
    first_name: updatedUser.first_name || updatedUser.name?.split(' ')[0] || 'משתמש',
    last_name: updatedUser.last_name || updatedUser.name?.split(' ').slice(1).join(' ') || null,
    username: updatedUser.username,
    photo_url: updatedUser.photo_url || null,
    department: updatedUser.department || null,
    phone: updatedUser.phone || null,
    requested_role: updatedUser.requested_role || updatedUser.role,
    assigned_role: updatedUser.assigned_role || updatedUser.role,
    status: updatedUser.registration_status || 'approved',
    approval_history: normalizeHistory(updatedUser.approval_history as RegistrationApproval[] | null),
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
    approved_by: updatedUser.approved_by || null,
    approved_at: updatedUser.approved_at || null,
    approval_notes: updatedUser.approval_notes || null
  } as UserRegistration;
}

export async function updateUserRegistrationRoleRecord(
  telegramId: string,
  input: UpdateUserRegistrationRoleInput
): Promise<UserRegistration> {
  const registration = await fetchUserRegistrationRecord(telegramId);
  if (!registration) {
    throw new Error('User registration not found');
  }

  const now = new Date().toISOString();
  const assignedRole = normalizeRole(input.assigned_role);
  const history = appendHistory(normalizeHistory(registration.approval_history), {
    action: 'updated',
    by: input.updated_by,
    at: now,
    notes: input.notes ?? null,
    assigned_role: assignedRole
  });

  const { data, error } = await supabase
    .from('user_registrations')
    .update({
      assigned_role: assignedRole,
      approval_notes: input.notes ?? registration.approval_notes ?? null,
      approval_history: history,
      updated_at: now
    })
    .eq('telegram_id', telegramId)
    .select('*')
    .single();

  if (error) throw error;

  await updateUserRoleAssignment(telegramId, assignedRole);

  return {
    ...data,
    approval_history: normalizeHistory(data.approval_history as RegistrationApproval[] | null)
  } as UserRegistration;
}

export async function deleteUserRegistrationRecord(telegramId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('user_registrations')
    .delete({ count: 'exact' })
    .eq('telegram_id', telegramId);

  if (error) throw error;

  return (count ?? 0) > 0;
}

export class SupabaseDataStore implements DataStore {
  private user: User | null = null;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private authInitialization: Promise<void> | null = null;
  private initialUserData: any = null;

  get supabase() {
    return getSupabaseInstance();
  }

  constructor(private userTelegramId: string, authSession?: SupabaseAuthSessionPayload | null, initialUserData?: any) {
    this.initialUserData = initialUserData;

    console.log('🏗️ SupabaseDataStore: Constructor called with:', {
      telegram_id: userTelegramId,
      hasAuthSession: !!authSession,
      hasInitialUserData: !!initialUserData,
      initialUserData: initialUserData ? {
        telegram_id: initialUserData.telegram_id,
        username: initialUserData.username,
        first_name: initialUserData.first_name,
        last_name: initialUserData.last_name,
        photo_url: initialUserData.photo_url
      } : null
    });

    if (authSession?.access_token && authSession.refresh_token) {
      this.authInitialization = this.initializeAuthSession(authSession);
    }

    // Initialize real-time subscriptions
    this.initializeRealTimeSubscriptions();
  }

  private async initializeAuthSession(authSession: SupabaseAuthSessionPayload) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: authSession.access_token,
        refresh_token: authSession.refresh_token,
        expires_in: authSession.expires_in ?? undefined,
        expires_at: authSession.expires_at ?? undefined,
        token_type: authSession.token_type ?? 'bearer'
      });

      if (error) {
        console.error('Failed to establish Supabase session:', error);
      }
    } catch (error) {
      console.error('Unexpected Supabase auth error:', error);
    }
  }

  private async refreshProductStock(productId: string) {
    const [{ data: balances, error: inventoryError }, { data: driverBalances, error: driverError }] = await Promise.all([
      supabase
        .from('inventory')
        .select('on_hand_quantity, reserved_quantity')
        .eq('product_id', productId),
      supabase
        .from('driver_inventory')
        .select('quantity')
        .eq('product_id', productId)
    ]);

    if (inventoryError) throw inventoryError;
    if (driverError) throw driverError;

    const locationTotal =
      balances?.reduce(
        (sum: number, row: { on_hand_quantity?: number | null; reserved_quantity?: number | null }) =>
          sum + (row.on_hand_quantity ?? 0) + (row.reserved_quantity ?? 0),
        0
      ) ?? 0;
    const driverTotal = driverBalances?.reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0) ?? 0;
    const total = locationTotal + driverTotal;

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: total, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) throw updateError;
  }

  private async recordInventoryLog(entry: {
    product_id: string;
    change_type: InventoryLogType;
    quantity_change: number;
    from_location_id?: string | null;
    to_location_id?: string | null;
    reference_id?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<string> {
    const payload = {
      ...entry,
      created_by: this.userTelegramId,
      created_at: new Date().toISOString(),
      metadata: entry.metadata || {}
    };

    const { data, error } = await supabase.from('inventory_logs').insert(payload).select('id').single();
    if (error) throw error;

    return data.id;
  }

  private async recordSalesLog(entry: {
    product_id: string;
    location_id: string;
    quantity: number;
    total_amount: number;
    reference_id?: string | null;
    recorded_by?: string | null;
    sold_at?: string | null;
    notes?: string | null;
  }): Promise<string> {
    const payload = {
      ...entry,
      recorded_by: entry.recorded_by || this.userTelegramId,
      sold_at: entry.sold_at || new Date().toISOString(),
      notes: entry.notes ?? null
    };

    const { data, error } = await supabase.from('sales_logs').insert(payload).select('id').single();
    if (error) throw error;

    return data.id;
  }

  private async recordDriverMovement(entry: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string | null;
  }) {
    const payload = {
      driver_id: entry.driver_id,
      zone_id: entry.zone_id ?? null,
      product_id: entry.product_id ?? null,
      quantity_change: entry.quantity_change ?? null,
      action: entry.action,
      details: entry.details ?? null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('driver_movements').insert(payload);
    if (error) throw error;
  }

  private async getCentralLocationId(): Promise<string> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('code', 'CENTRAL')
      .maybeSingle();

    if (error) throw error;

    if (data?.id) {
      return data.id;
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('type', 'central')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;

    if (!fallback?.id) {
      throw new Error('לא נמצא מיקום מרכזי עבור המלאי');
    }

    return fallback.id;
  }

  private initializeRealTimeSubscriptions() {
    // Subscribe to order changes
    const orderChannel = supabase.channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        this.notifyListeners('orders', payload);
      })
      .subscribe();

    this.subscriptions.set('orders', orderChannel);

    // Subscribe to task changes
    const taskChannel = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        this.notifyListeners('tasks', payload);
      })
      .subscribe();

    this.subscriptions.set('tasks', taskChannel);

    // Subscribe to notification changes
    const notificationChannel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${this.userTelegramId}`
      }, (payload) => {
        this.notifyListeners('notifications', payload);
      })
      .subscribe();

    this.subscriptions.set('notifications', notificationChannel);

    // Subscribe to product changes
    const productChannel = supabase.channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        this.notifyListeners('products', payload);
      })
      .subscribe();

    this.subscriptions.set('products', productChannel);

    // Subscribe to inventory changes
    const inventoryChannel = supabase.channel('inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        this.notifyListeners('inventory', payload);
      })
      .subscribe();

    this.subscriptions.set('inventory', inventoryChannel);

    // Subscribe to driver inventory changes
    const driverInventoryChannel = supabase.channel('driver_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_inventory' }, (payload) => {
        this.notifyListeners('driver_inventory', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_inventory', driverInventoryChannel);

    // Subscribe to restock request changes
    const restockChannel = supabase.channel('restock_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_requests' }, (payload) => {
        this.notifyListeners('restock_requests', payload);
      })
      .subscribe();

    this.subscriptions.set('restock_requests', restockChannel);

    // Subscribe to inventory logs
    const logChannel = supabase.channel('inventory_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs' }, (payload) => {
        this.notifyListeners('inventory_logs', payload);
      })
      .subscribe();

    this.subscriptions.set('inventory_logs', logChannel);

    const zonesChannel = supabase.channel('zones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, (payload) => {
        this.notifyListeners('zones', payload);
      })
      .subscribe();

    this.subscriptions.set('zones', zonesChannel);

    const driverZonesChannel = supabase.channel('driver_zones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_zones' }, (payload) => {
        this.notifyListeners('driver_zones', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_zones', driverZonesChannel);

    const driverStatusChannel = supabase.channel('driver_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_status' }, (payload) => {
        this.notifyListeners('driver_status', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_status', driverStatusChannel);

    const driverMovementsChannel = supabase.channel('driver_movements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_movements' }, (payload) => {
        this.notifyListeners('driver_movements', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_movements', driverMovementsChannel);

    // Subscribe to business changes
    const businessChannel = supabase.channel('businesses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, (payload) => {
        this.notifyListeners('businesses', payload);
      })
      .subscribe();

    this.subscriptions.set('businesses', businessChannel);

    // Subscribe to business_users changes
    const businessUsersChannel = supabase.channel('business_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_users' }, (payload) => {
        this.notifyListeners('business_users', payload);
      })
      .subscribe();

    this.subscriptions.set('business_users', businessUsersChannel);

    // Subscribe to users table changes
    const usersChannel = supabase.channel('users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        this.notifyListeners('users', payload);
      })
      .subscribe();

    this.subscriptions.set('users', usersChannel);
  }

  private notifyListeners(table: string, payload: any) {
    const listeners = this.eventListeners.get(table);
    if (listeners) {
      listeners.forEach(callback => callback(payload));
    }
  }

  // Real-time subscription methods
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!this.eventListeners.has(table)) {
      this.eventListeners.set(table, new Set());
    }
    this.eventListeners.get(table)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(table);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Cleanup subscriptions
  cleanup() {
    this.subscriptions.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.eventListeners.clear();
  }

  // Auth & Profile
  async getProfile(forceRefresh = false): Promise<User> {
    if (this.user && !forceRefresh) {
      console.log('getProfile: Returning cached user', { role: this.user.role });
      return this.user;
    }

    // Wait for auth session to be established if it's in progress
    if (this.authInitialization) {
      console.log('getProfile: Waiting for auth initialization...');
      try {
        await this.authInitialization;
        console.log('getProfile: Auth initialization complete');
      } catch (error) {
        console.error('getProfile: Auth initialization failed:', error);
      }
    }

    console.log(`🔍 getProfile: Fetching profile for telegram_id: ${this.userTelegramId}`);

    // Create fresh client to bypass any caching
    const config = await loadConfig();
    const freshClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data, error } = await freshClient
      .from('users')
      .select('id, telegram_id, role, name, username, photo_url, department, phone, business_id, last_active, created_at, updated_at')
      .eq('telegram_id', this.userTelegramId)
      .maybeSingle();

    console.log('🔍 getProfile: RAW RESPONSE:', {
      hasData: !!data,
      hasError: !!error,
      data: data ? JSON.stringify(data) : 'null',
      error: error ? JSON.stringify(error) : 'null',
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ getProfile: Database error:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ getProfile: User not found, creating new user');

      // Validate telegram_id before creating user
      if (!this.userTelegramId) {
        console.error('❌ Cannot create user: telegram_id is missing', {
          userTelegramId: this.userTelegramId,
          initialUserData: this.initialUserData
        });
        throw new Error('Cannot create user without telegram_id');
      }

      // Create user if doesn't exist - Auto-register new Telegram users
      const telegramUserData = this.initialUserData as any;
      const newUser: Omit<User, 'id'> = {
        telegram_id: this.userTelegramId,
        username: telegramUserData?.username?.toLowerCase() || null,
        role: 'user', // Default to 'user' role (can be promoted to driver/manager/owner later)
        name: telegramUserData?.first_name
          ? `${telegramUserData.first_name}${telegramUserData.last_name ? ' ' + telegramUserData.last_name : ''}`
          : 'משתמש חדש',
        photo_url: telegramUserData?.photo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Auto-registering new Telegram user:', {
        telegram_id: newUser.telegram_id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role
      });

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select('id, telegram_id, role, name, username, photo_url, department, phone, business_id, last_active, created_at, updated_at')
        .single();

      if (createError) {
        console.error('getProfile: Failed to create user:', createError);
        throw createError;
      }

      console.log('✅ getProfile: Created new user', { role: created.role });
      this.user = created;
      return created;
    }

    console.log('✅ getProfile: Successfully fetched profile from DB:', {
      role: data.role,
      telegram_id: data.telegram_id,
      updated_at: data.updated_at
    });

    // Update user with latest Telegram data if available
    const telegramUserData = this.initialUserData as any;
    if (telegramUserData && (telegramUserData.first_name || telegramUserData.username || telegramUserData.photo_url)) {
      const updates: any = {};

      // Update name if we have first_name
      if (telegramUserData.first_name) {
        const newName = `${telegramUserData.first_name}${telegramUserData.last_name ? ' ' + telegramUserData.last_name : ''}`;
        if (newName !== data.name) {
          updates.name = newName;
        }
      }

      // Update username if different
      if (telegramUserData.username && telegramUserData.username.toLowerCase() !== data.username) {
        updates.username = telegramUserData.username.toLowerCase();
      }

      // Update photo_url if different
      if (telegramUserData.photo_url && telegramUserData.photo_url !== data.photo_url) {
        updates.photo_url = telegramUserData.photo_url;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log('🔄 getProfile: Updating user with latest Telegram data:', updates);
        updates.updated_at = new Date().toISOString();

        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('telegram_id', this.userTelegramId)
          .select('id, telegram_id, role, name, username, photo_url, department, phone, business_id, last_active, created_at, updated_at')
          .maybeSingle();

        if (updateError) {
          console.error('⚠️ getProfile: Failed to update user data:', updateError);
          // Continue with existing data
        } else if (updated) {
          console.log('✅ getProfile: User data updated successfully');
          this.user = updated;
          return updated;
        } else {
          console.warn('⚠️ getProfile: Update succeeded but no data returned');
        }
      }
    }

    this.user = data;
    return data;
  }

  async refreshProfile(): Promise<User> {
    return this.getProfile(true);
  }

  async getCurrentRole(): Promise<User['role'] | null> {
    if (!this.userTelegramId) {
      console.warn('getCurrentRole: No userTelegramId provided');
      return null;
    }

    // Wait for auth session to be established if it's in progress
    if (this.authInitialization) {
      console.log('getCurrentRole: Waiting for auth initialization...');
      try {
        await this.authInitialization;
        console.log('getCurrentRole: Auth initialization complete');
      } catch (error) {
        console.error('getCurrentRole: Auth initialization failed:', error);
      }
    }

    console.log(`🔍 getCurrentRole: Fetching role for telegram_id: ${this.userTelegramId}`);

    // Create fresh client to bypass any caching
    const config = await loadConfig();
    const freshClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data, error} = await freshClient
      .from('users')
      .select('id, telegram_id, role, name, username, photo_url, department, phone, business_id, last_active')
      .eq('telegram_id', this.userTelegramId)
      .maybeSingle();

    console.log('🔍 getCurrentRole: RAW RESPONSE:', {
      hasData: !!data,
      hasError: !!error,
      data: data ? JSON.stringify(data) : 'null',
      error: error ? JSON.stringify(error) : 'null',
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ getCurrentRole: Database error:', error);
      throw error;
    }

    if (!data) {
      console.warn('⚠️ getCurrentRole: No user found in database (RLS blocked?)');
      return null;
    }

    console.log(`✅ getCurrentRole: Successfully fetched role: ${data.role}`);
    this.user = data;
    return data.role;
  }

  clearUserCache(): void {
    console.log('🗑️ clearUserCache: Clearing cached user data [BUILD v2]');
    this.user = null;
  }

  async updateProfile(updates: Partial<User>): Promise<void> {
    // First, ensure user exists in database
    await this.ensureUserExists();

    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('telegram_id', this.userTelegramId);

    if (error) throw error;

    // Update cached user
    if (this.user) {
      this.user = { ...this.user, ...updates };
    }
  }

  private async ensureUserExists(): Promise<void> {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', this.userTelegramId)
      .maybeSingle();

    if (existingUser) return;

    // User doesn't exist, create them
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: this.userTelegramId,
        username: this.user?.username || null,
        name: this.user?.first_name ?
          [this.user.first_name, this.user.last_name].filter(Boolean).join(' ') :
          null,
        role: 'owner',
        photo_url: this.user?.photo_url || null
      });

    if (insertError) {
      console.error('Failed to create user record:', insertError);
      throw new Error('Failed to create user record');
    }

    console.log(`✅ Created user record for ${this.userTelegramId}`);
  }

  // Products
  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    let query = supabase.from('products').select('*');

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.q) {
      query = query.or(`name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getProduct(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    const now = new Date().toISOString();
    const centralLocationId = await this.getCentralLocationId();

    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert({
        product_id: data.id,
        location_id: centralLocationId,
        on_hand_quantity: input.stock_quantity ?? 0,
        reserved_quantity: 0,
        damaged_quantity: 0,
        low_stock_threshold: 10,
        updated_at: now
      });

    if (inventoryError) throw inventoryError;

    if ((input.stock_quantity ?? 0) !== 0) {
      await this.recordInventoryLog({
        product_id: data.id,
        change_type: 'restock',
        quantity_change: input.stock_quantity ?? 0,
        to_location_id: centralLocationId
      });
    }

    await this.refreshProductStock(data.id);

    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (typeof updates.stock_quantity === 'number') {
      await this.refreshProductStock(id);
    }
  }

  // Inventory
  async listInventory(filters?: {
    product_id?: string;
    location_id?: string;
    location_ids?: string[];
  }): Promise<InventoryRecord[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות במלאי');
    }

    let query = supabase
      .from('inventory')
      .select(
        `id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at,
         product:products(*),
         location:inventory_locations(*)`
      );

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      query = query.in('location_id', filters.location_ids);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      on_hand_quantity: row.on_hand_quantity,
      reserved_quantity: row.reserved_quantity,
      damaged_quantity: row.damaged_quantity,
      low_stock_threshold: row.low_stock_threshold,
      updated_at: row.updated_at,
      product: row.product || undefined,
      location: row.location || undefined
    }));
  }

  async getInventory(productId: string, locationId?: string): Promise<InventoryRecord | null> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות במלאי');
    }

    let query = supabase
      .from('inventory')
      .select(
        `id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at,
         product:products(*),
         location:inventory_locations(*)`
      )
      .eq('product_id', productId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const record = data?.[0];
    if (!record) return null;

    return {
      id: record.id,
      product_id: record.product_id,
      location_id: record.location_id,
      on_hand_quantity: record.on_hand_quantity,
      reserved_quantity: record.reserved_quantity,
      damaged_quantity: record.damaged_quantity,
      low_stock_threshold: record.low_stock_threshold,
      updated_at: record.updated_at,
      product: record.product || undefined,
      location: record.location || undefined
    };
  }

  async listInventoryLocations(): Promise<InventoryLocation[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות במיקומי המלאי');
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async listDriverInventory(filters?: {
    driver_id?: string;
    product_id?: string;
    driver_ids?: string[];
  }): Promise<DriverInventoryRecord[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות במלאי נהגים');
    }

    const profile = await this.getProfile();
    if (profile.role === 'driver') {
      const targetDriverId = filters?.driver_id || this.userTelegramId;
      if (targetDriverId !== this.userTelegramId) {
        throw new Error('נהגים יכולים לצפות רק במלאי האישי שלהם');
      }
    }

    let query = supabase
      .from('driver_inventory')
      .select('id, product_id, driver_id, quantity, location_id, updated_at, product:products(*), location:inventory_locations(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.driver_ids && filters.driver_ids.length > 0) {
      query = query.in('driver_id', filters.driver_ids);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      driver_id: row.driver_id,
      quantity: row.quantity,
      updated_at: row.updated_at,
      location_id: row.location_id,
      location: row.location || undefined,
      product: row.product || undefined
    }));
  }

  async getInventorySummary(productId: string): Promise<InventoryBalanceSummary> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות במלאי');
    }

    const [productResponse, inventoryResponse, driverResponse, restockResponse] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle(),
      supabase
        .from('inventory')
        .select(
          `id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, updated_at,
           location:inventory_locations(*)`
        )
        .eq('product_id', productId),
      supabase
        .from('driver_inventory')
        .select('id, driver_id, product_id, quantity, updated_at, location_id')
        .eq('product_id', productId),
      supabase
        .from('restock_requests')
        .select(
          `id, product_id, requested_by, requested_quantity, status, from_location_id, to_location_id, approved_by,
           approved_quantity, fulfilled_by, fulfilled_quantity, notes, created_at, updated_at,
           from_location:inventory_locations!restock_requests_from_location_id_fkey(*),
           to_location:inventory_locations!restock_requests_to_location_id_fkey(*),
           product:products(*)`
        )
        .eq('product_id', productId)
        .in('status', ['pending', 'approved', 'in_transit'])
    ]);

    if (productResponse.error) throw productResponse.error;
    if (inventoryResponse.error) throw inventoryResponse.error;
    if (driverResponse.error) throw driverResponse.error;
    if (restockResponse.error) throw restockResponse.error;

    const inventoryRows = inventoryResponse.data || [];
    const driverRows = driverResponse.data || [];
    const restockRows = restockResponse.data || [];

    const locations: LocationInventoryBalance[] = inventoryRows.map((row: any) => {
      const pending = restockRows
        .filter((request: any) => request.to_location_id === row.location_id)
        .reduce((sum: number, request: any) => sum + (request.requested_quantity ?? 0), 0);

      return {
        location_id: row.location_id,
        on_hand_quantity: row.on_hand_quantity ?? 0,
        reserved_quantity: row.reserved_quantity ?? 0,
        damaged_quantity: row.damaged_quantity ?? 0,
        pending_restock_quantity: pending,
        location: row.location || undefined
      };
    });

    const total_on_hand = locations.reduce((sum, loc) => sum + loc.on_hand_quantity, 0);
    const total_reserved = locations.reduce((sum, loc) => sum + loc.reserved_quantity, 0);
    const total_damaged = locations.reduce((sum, loc) => sum + loc.damaged_quantity, 0);

    const drivers = driverRows.map((row: any) => ({
      driver_id: row.driver_id,
      product_id: row.product_id,
      quantity: row.quantity ?? 0,
      location_id: row.location_id ?? null,
      updated_at: row.updated_at
    }));

    const total_driver_quantity = drivers.reduce((sum, driver) => sum + (driver.quantity ?? 0), 0);

    const lastUpdatedCandidates = [
      ...inventoryRows.map((row: any) => row.updated_at),
      ...driverRows.map((row: any) => row.updated_at)
    ].filter(Boolean);

    const last_updated = lastUpdatedCandidates.length
      ? new Date(
          Math.max(
            ...lastUpdatedCandidates.map((date: string) => new Date(date).getTime())
          )
        ).toISOString()
      : undefined;

    const openRestockRequests: RestockRequest[] = restockRows.map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      requested_by: row.requested_by,
      requested_quantity: row.requested_quantity,
      status: row.status,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      from_location: row.from_location || null,
      to_location: row.to_location || null,
      product: row.product || undefined
    }));

    return {
      product_id: productId,
      product: productResponse.data || undefined,
      total_on_hand,
      total_reserved,
      total_damaged,
      total_driver_quantity,
      locations,
      drivers,
      open_restock_requests: openRestockRequests,
      last_updated
    };
  }

  async listRestockRequests(filters?: {
    status?: RestockRequestStatus | 'all';
    onlyMine?: boolean;
    product_id?: string;
    location_id?: string;
  }): Promise<RestockRequest[]> {
    const permissions = await this.getRolePermissions();
    const profile = await this.getProfile();

    if (!permissions.can_view_inventory && !filters?.onlyMine) {
      throw new Error('אין לך הרשאה לצפות בבקשות חידוש מלאי');
    }

    let query = supabase
      .from('restock_requests')
      .select(
        `*,
         product:products(*),
         from_location:inventory_locations!restock_requests_from_location_id_fkey(*),
         to_location:inventory_locations!restock_requests_to_location_id_fkey(*)`
      );

    if (filters?.onlyMine || profile.role === 'driver') {
      query = query.eq('requested_by', this.userTelegramId);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.onlyMine) {
      query = query.eq('requested_by', this.userTelegramId);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('to_location_id', filters.location_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      requested_by: row.requested_by,
      requested_quantity: row.requested_quantity,
      status: row.status,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      from_location: row.from_location || null,
      to_location: row.to_location || null,
      product: row.product || undefined
    }));
  }

  async submitRestockRequest(input: RestockRequestInput): Promise<{ id: string }> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_request_restock) {
      throw new Error('אין לך הרשאה לבקש חידוש מלאי');
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('restock_requests')
      .insert({
        product_id: input.product_id,
        requested_by: this.userTelegramId,
        requested_quantity: input.requested_quantity,
        to_location_id: input.to_location_id,
        from_location_id: input.from_location_id ?? null,
        status: 'pending',
        notes: input.notes || null,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (error) throw error;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'reservation',
      quantity_change: input.requested_quantity,
      from_location_id: input.from_location_id ?? null,
      to_location_id: input.to_location_id,
      reference_id: data.id,
      metadata: { note: input.notes || null, event: 'restock_requested' }
    });

    return { id: data.id };
  }

  async approveRestockRequest(id: string, input: RestockApprovalInput): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לאשר בקשות חידוש');
    }

    const { error } = await supabase.rpc('approve_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_from_location_id: input.from_location_id,
      p_approved_quantity: input.approved_quantity,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async fulfillRestockRequest(id: string, input: RestockFulfillmentInput): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_fulfill_restock) {
      throw new Error('אין לך הרשאה לסמן אספקת חידוש');
    }

    const { error } = await supabase.rpc('fulfill_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_fulfilled_quantity: input.fulfilled_quantity,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async rejectRestockRequest(id: string, input?: { notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לדחות בקשות');
    }

    const { error } = await supabase.rpc('reject_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_notes: input?.notes || null
    });

    if (error) throw error;
  }

  async transferInventory(input: InventoryTransferInput): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_transfer_inventory) {
      throw new Error('אין לך הרשאה להעביר מלאי בין מיקומים');
    }

    if (input.quantity <= 0) {
      throw new Error('כמות ההעברה חייבת להיות גדולה מאפס');
    }

    if (input.from_location_id === input.to_location_id) {
      throw new Error('מקור ויעד ההעברה חייבים להיות שונים');
    }

    const { error } = await supabase.rpc('perform_inventory_transfer', {
      p_product_id: input.product_id,
      p_from_location_id: input.from_location_id,
      p_to_location_id: input.to_location_id,
      p_quantity: input.quantity,
      p_actor: this.userTelegramId,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;

    await this.refreshProductStock(input.product_id);
  }

  async transferInventoryToDriver(input: DriverInventoryTransferInput): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_transfer_inventory) {
      throw new Error('אין לך הרשאה להעביר מלאי לנהגים');
    }

    if (input.quantity <= 0) {
      throw new Error('יש להעביר כמות חיובית');
    }

    const centralLocationId = await this.getCentralLocationId();

    const { data: centralBalance, error: balanceError } = await supabase
      .from('inventory')
      .select('on_hand_quantity')
      .eq('product_id', input.product_id)
      .eq('location_id', centralLocationId)
      .maybeSingle();

    if (balanceError) throw balanceError;

    const available = centralBalance?.on_hand_quantity ?? 0;
    if (available < input.quantity) {
      throw new Error('אין מספיק מלאי במחסן המרכזי');
    }

    const now = new Date().toISOString();

    const { error: updateCentralError } = await supabase
      .from('inventory')
      .update({ on_hand_quantity: available - input.quantity, updated_at: now })
      .eq('product_id', input.product_id)
      .eq('location_id', centralLocationId);

    if (updateCentralError) throw updateCentralError;

    const { data: driverRow, error: driverError } = await supabase
      .from('driver_inventory')
      .select('id, quantity, location_id')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (driverError) throw driverError;

    const driverQuantity = driverRow?.quantity ?? 0;
    const newQuantity = driverQuantity + input.quantity;

    const driverPayload = driverRow
      ? { quantity: newQuantity, updated_at: now }
      : {
          driver_id: input.driver_id,
          product_id: input.product_id,
          quantity: newQuantity,
          updated_at: now
        };

    const { error: driverUpsertError } = driverRow
      ? await supabase.from('driver_inventory').update(driverPayload).eq('id', driverRow.id)
      : await supabase.from('driver_inventory').insert(driverPayload);

    if (driverUpsertError) throw driverUpsertError;

    const driverLocationId = driverRow?.location_id ?? null;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'transfer',
      quantity_change: -input.quantity,
      from_location_id: centralLocationId,
      to_location_id: driverLocationId,
      metadata: { target: 'driver', driver_id: input.driver_id, notes: input.notes || null, direction: 'outbound' }
    });

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'transfer',
      quantity_change: input.quantity,
      from_location_id: centralLocationId,
      to_location_id: driverLocationId,
      metadata: { target: 'driver', driver_id: input.driver_id, notes: input.notes || null, direction: 'inbound' }
    });

    await this.refreshProductStock(input.product_id);
  }

  async adjustDriverInventory(input: DriverInventoryAdjustmentInput): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_adjust_inventory) {
      throw new Error('אין לך הרשאה לעדכן מלאי נהגים');
    }

    const now = new Date().toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from('driver_inventory')
      .select('id, quantity, location_id')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentQuantity = existing?.quantity ?? 0;
    const newQuantity = currentQuantity + input.quantity_change;

    if (newQuantity < 0) {
      throw new Error('לא ניתן להוריד את המלאי של הנהג מתחת לאפס');
    }

    const upsertPayload = existing
      ? { quantity: newQuantity, updated_at: now }
      : {
          driver_id: input.driver_id,
          product_id: input.product_id,
          quantity: newQuantity,
          updated_at: now
        };

    const { error: upsertError } = existing
      ? await supabase
          .from('driver_inventory')
          .update(upsertPayload)
          .eq('id', existing.id)
      : await supabase
          .from('driver_inventory')
          .insert(upsertPayload);

    if (upsertError) throw upsertError;

    const action: DriverMovementAction = input.quantity_change >= 0 ? 'inventory_added' : 'inventory_removed';
    const details = input.notes ? `${input.reason} - ${input.notes}` : input.reason;

    await this.recordDriverMovement({
      driver_id: input.driver_id,
      zone_id: input.zone_id ?? null,
      product_id: input.product_id,
      quantity_change: input.quantity_change,
      action,
      details
    });

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'adjustment',
      quantity_change: input.quantity_change,
      from_location_id: existing?.location_id ?? null,
      to_location_id: existing?.location_id ?? null,
      metadata: { target: 'driver', driver_id: input.driver_id, reason: input.reason, notes: input.notes || null }
    });

    await this.refreshProductStock(input.product_id);
  }

  async listInventoryLogs(filters?: {
    product_id?: string;
    location_id?: string;
    limit?: number;
  }): Promise<InventoryLog[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_movements) {
      throw new Error('אין לך הרשאה לצפות ביומן התנועות');
    }

    let query = supabase
      .from('inventory_logs')
      .select(
        `id, product_id, change_type, quantity_change, from_location_id, to_location_id, reference_id, created_by, created_at, metadata,
         product:products(*),
         from_location:inventory_locations!inventory_logs_from_location_id_fkey(*),
         to_location:inventory_locations!inventory_logs_to_location_id_fkey(*)`
      );

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.or(`from_location_id.eq.${filters.location_id},to_location_id.eq.${filters.location_id}`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      change_type: row.change_type,
      quantity_change: row.quantity_change,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      reference_id: row.reference_id,
      created_by: row.created_by,
      created_at: row.created_at,
      metadata: row.metadata,
      product: row.product || undefined,
      from_location: row.from_location || null,
      to_location: row.to_location || null
    }));
  }

  async listSalesLogs(filters?: { product_id?: string; location_id?: string; limit?: number }): Promise<SalesLog[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_sales) {
      throw new Error('אין לך הרשאה לצפות במכירות');
    }

    let query = supabase
      .from('sales_logs')
      .select('id, product_id, location_id, quantity, total_amount, reference_id, recorded_by, sold_at, notes, product:products(*), location:inventory_locations(*)');

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('sold_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      quantity: row.quantity,
      total_amount: Number(row.total_amount ?? 0),
      reference_id: row.reference_id,
      recorded_by: row.recorded_by,
      sold_at: row.sold_at,
      notes: row.notes || null,
      product: row.product || undefined,
      location: row.location || undefined
    }));
  }

  async recordSale(input: SalesLogInput): Promise<{ id: string }> {
    const profile = await this.getProfile();
    if (!['manager', 'sales'].includes(profile.role)) {
      throw new Error('רק מנהלים או אנשי מכירות יכולים לדווח על מכירה');
    }

    if (input.quantity <= 0) {
      throw new Error('כמות המכירה חייבת להיות גדולה מאפס');
    }

    const id = await this.recordSalesLog({
      product_id: input.product_id,
      location_id: input.location_id,
      quantity: input.quantity,
      total_amount: input.total_amount,
      reference_id: input.reference_id ?? null,
      sold_at: input.sold_at ?? null,
      notes: input.notes ?? null
    });

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'sale',
      quantity_change: -Math.abs(input.quantity),
      from_location_id: input.location_id,
      metadata: {
        reference_id: input.reference_id ?? null,
        recorded_by: this.userTelegramId,
        event: 'sale_recorded'
      }
    });

    await this.refreshProductStock(input.product_id);

    return { id };
  }

  async getLowStockAlerts(filters?: { location_id?: string }): Promise<InventoryAlert[]> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_view_inventory) {
      throw new Error('אין לך הרשאה לצפות בהתראות מלאי');
    }

    let query = supabase.from('inventory_low_stock_alerts').select('*');

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      location_id: row.location_id,
      location_name: row.location_name,
      on_hand_quantity: row.on_hand_quantity,
      reserved_quantity: row.reserved_quantity,
      low_stock_threshold: row.low_stock_threshold,
      triggered_at: row.triggered_at
    }));
  }

  async getRolePermissions(): Promise<RolePermissions> {
    const profile = await this.getProfile();

    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', profile.role)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return data as RolePermissions;
    }

    const defaults: RolePermissions = {
      role: profile.role,
      can_view_inventory: ['manager', 'warehouse', 'dispatcher', 'driver'].includes(profile.role),
      can_request_restock: ['manager', 'warehouse', 'dispatcher', 'driver'].includes(profile.role),
      can_approve_restock: ['manager', 'warehouse'].includes(profile.role),
      can_fulfill_restock: ['manager', 'warehouse'].includes(profile.role),
      can_transfer_inventory: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_adjust_inventory: ['manager', 'warehouse'].includes(profile.role),
      can_view_movements: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_manage_locations: profile.role === 'manager',
      can_view_sales: ['manager', 'sales'].includes(profile.role)
    };

    return defaults;
  }
  // Zones & Dispatch
  async listZones(filters?: { business_id?: string; city?: string; region?: string; includeDeleted?: boolean }): Promise<Zone[]> {
    let query = supabase
      .from('zones')
      .select('*');

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.region) {
      query = query.eq('region', filters.region);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getZone(id: string): Promise<Zone | null> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async createZone(input: CreateZoneInput): Promise<{ id: string }> {
    const now = new Date().toISOString();

    const zoneData = {
      name: input.name,
      code: input.code || null,
      description: input.description || null,
      color: input.color || null,
      city: input.city || null,
      region: input.region || null,
      polygon: input.polygon || null,
      business_id: input.business_id || null,
      metadata: input.metadata || {},
      active: input.active !== undefined ? input.active : true,
      created_by: this.userTelegramId,
      updated_by: this.userTelegramId,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('zones')
      .insert(zoneData)
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateZone(id: string, input: UpdateZoneInput): Promise<void> {
    const updateData: any = {
      ...input,
      updated_by: this.userTelegramId,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('zones')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteZone(id: string, softDelete: boolean = true): Promise<void> {
    if (softDelete) {
      const { error } = await supabase
        .from('zones')
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: this.userTelegramId
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  }

  async restoreZone(id: string): Promise<void> {
    const { error } = await supabase
      .from('zones')
      .update({
        deleted_at: null,
        updated_by: this.userTelegramId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getZoneAuditLogs(zoneId: string, limit: number = 50): Promise<ZoneAuditLog[]> {
    const { data, error } = await supabase
      .from('zone_audit_logs')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async listDriverZones(filters?: { driver_id?: string; zone_id?: string; activeOnly?: boolean }): Promise<DriverZoneAssignment[]> {
    let query = supabase
      .from('driver_zones')
      .select('*, zones(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.activeOnly) {
      query = query.eq('active', true);
    }

    query = query.order('assigned_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      active: row.active,
      assigned_at: row.assigned_at,
      unassigned_at: row.unassigned_at,
      assigned_by: row.assigned_by,
      zone: row.zones || undefined
    }));
  }

  async assignDriverToZone(input: { zone_id: string; driver_id?: string; active?: boolean }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = new Date().toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from('driver_zones')
      .select('id, active, assigned_at')
      .eq('driver_id', driverId)
      .eq('zone_id', input.zone_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const makeActive = input.active !== false;

    if (existing) {
      const updatePayload: any = { active: makeActive };
      if (makeActive) {
        updatePayload.assigned_at = now;
        updatePayload.unassigned_at = null;
      } else {
        updatePayload.unassigned_at = now;
      }

      const { error: updateError } = await supabase
        .from('driver_zones')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else if (makeActive) {
      const { error: insertError } = await supabase
        .from('driver_zones')
        .insert({
          driver_id: driverId,
          zone_id: input.zone_id,
          active: true,
          assigned_at: now,
          assigned_by: this.userTelegramId
        });

      if (insertError) throw insertError;
    } else {
      return;
    }

    await this.recordDriverMovement({
      driver_id: driverId,
      zone_id: input.zone_id,
      action: makeActive ? 'zone_joined' : 'zone_left',
      details: `Updated by ${this.userTelegramId}`
    });

    if (!makeActive) {
      const status = await this.getDriverStatus(driverId);
      if (status?.current_zone_id === input.zone_id) {
        await this.updateDriverStatus({
          driver_id: driverId,
          status: status.status,
          zone_id: null,
          is_online: status.is_online,
          note: status.note || undefined
        });
      }
    }
  }

  async unassignDriverFromZone(input: { zone_id: string; driver_id?: string }): Promise<void> {
    await this.assignDriverToZone({
      zone_id: input.zone_id,
      driver_id: input.driver_id,
      active: false
    });
  }

  async updateDriverStatus(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = new Date().toISOString();

    const payload: any = {
      driver_id: driverId,
      status: input.status,
      is_online: typeof input.is_online === 'boolean' ? input.is_online : input.status !== 'off_shift',
      note: input.note ?? null,
      last_updated: now
    };

    if (typeof input.zone_id !== 'undefined') {
      payload.current_zone_id = input.zone_id;
    }

    const { error } = await supabase
      .from('driver_status')
      .upsert(payload, { onConflict: 'driver_id' });

    if (error) throw error;

    await this.recordDriverMovement({
      driver_id: driverId,
      zone_id: input.zone_id ?? null,
      action: 'status_changed',
      details: `Status changed to ${input.status}`
    });
  }

  async setDriverOnline(input?: {
    driver_id?: string;
    zone_id?: string | null;
    status?: DriverAvailabilityStatus;
    note?: string;
  }): Promise<void> {
    const driverId = input?.driver_id || this.userTelegramId;
    const existingStatus = await this.getDriverStatus(driverId);
    const hasZoneOverride = input && Object.prototype.hasOwnProperty.call(input, 'zone_id');
    const zoneId = hasZoneOverride ? input?.zone_id ?? null : existingStatus?.current_zone_id ?? null;
    const status: DriverAvailabilityStatus = input?.status || (existingStatus?.status === 'off_shift' ? 'available' : existingStatus?.status || 'available');

    await this.updateDriverStatus({
      driver_id: driverId,
      status,
      zone_id: zoneId,
      is_online: true,
      note: input?.note ?? existingStatus?.note ?? undefined
    });
  }

  async setDriverOffline(input?: { driver_id?: string; note?: string }): Promise<void> {
    const driverId = input?.driver_id || this.userTelegramId;
    const existingStatus = await this.getDriverStatus(driverId);

    await this.updateDriverStatus({
      driver_id: driverId,
      status: 'off_shift',
      zone_id: null,
      is_online: false,
      note: input?.note ?? existingStatus?.note ?? undefined
    });
  }

  async toggleDriverOnline(input: {
    driver_id?: string;
    zone_id?: string | null;
    is_online: boolean;
    status?: DriverAvailabilityStatus;
    note?: string;
  }): Promise<void> {
    if (input.is_online) {
      await this.setDriverOnline({
        driver_id: input.driver_id,
        zone_id: typeof input.zone_id === 'undefined' ? undefined : input.zone_id,
        status: input.status,
        note: input.note
      });
    } else {
      await this.setDriverOffline({
        driver_id: input.driver_id,
        note: input.note
      });
    }
  }

  async getDriverStatus(driver_id?: string): Promise<DriverStatusRecord | null> {
    const targetDriver = driver_id || this.userTelegramId;

    const { data, error } = await supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', targetDriver)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let zone: Zone | undefined;
    if (data.current_zone_id) {
      const zoneData = await this.getZone(data.current_zone_id);
      if (zoneData) {
        zone = zoneData;
      }
    }

    return {
      driver_id: data.driver_id,
      status: data.status,
      is_online: data.is_online,
      current_zone_id: data.current_zone_id,
      last_updated: data.last_updated,
      note: data.note,
      zone
    };
  }

  async listDriverStatuses(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]> {
    let query = supabase
      .from('driver_status')
      .select('*');

    if (filters?.zone_id) {
      query = query.eq('current_zone_id', filters.zone_id);
    }

    if (filters?.onlyOnline) {
      query = query.eq('is_online', true);
    }

    query = query.order('last_updated', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(
      new Set(
        rows
          .map((row: any) => row.current_zone_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    return rows.map((row: any) => ({
      driver_id: row.driver_id,
      status: row.status,
      is_online: row.is_online,
      current_zone_id: row.current_zone_id,
      last_updated: row.last_updated,
      note: row.note,
      zone: row.current_zone_id ? zoneMap.get(row.current_zone_id) : undefined
    }));
  }

  async getZoneCoverage(filters?: {
    zone_id?: string;
    includeOrders?: boolean;
    onlyActive?: boolean;
  }): Promise<ZoneCoverageSnapshot[]> {
    const includeOrders = filters?.includeOrders !== false;
    const onlyActive = filters?.onlyActive !== false;

    const [zones, statuses, assignments] = await Promise.all([
      this.listZones(),
      this.listDriverStatuses({
        zone_id: filters?.zone_id,
        onlyOnline: true
      }),
      this.listDriverZones
        ? this.listDriverZones({
            zone_id: filters?.zone_id,
            activeOnly: onlyActive
          })
        : Promise.resolve([])
    ]);

    const filteredZones = zones.filter((zone) => {
      if (filters?.zone_id && zone.id !== filters.zone_id) {
        return false;
      }
      if (onlyActive && zone.active === false) {
        return false;
      }
      return true;
    });

    const driverIds = Array.from(
      new Set(statuses.map((status) => status.driver_id))
    );

    const inventory = this.listDriverInventory
      ? await this.listDriverInventory({ driver_ids: driverIds })
      : [];

    const outstandingOrders = includeOrders && this.listOrders
      ? (await this.listOrders())
          .filter((order) =>
            ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)
          )
      : [];

    return filteredZones.map((zone) => {
      const zoneStatuses = statuses.filter((status) => status.current_zone_id === zone.id);
      const zoneAssignments = assignments.filter((assignment) => assignment.zone_id === zone.id);
      const zoneDriverIds = new Set(zoneStatuses.map((status) => status.driver_id));
      const zoneInventory = inventory.filter((record) => zoneDriverIds.has(record.driver_id));
      const zoneOrders = outstandingOrders.filter((order) =>
        order.assigned_driver ? zoneDriverIds.has(order.assigned_driver) : false
      );
      const idleDrivers = zoneStatuses.filter((status) => status.status === 'available');

      return {
        zone,
        onlineDrivers: zoneStatuses,
        idleDrivers,
        assignments: zoneAssignments,
        inventory: zoneInventory,
        outstandingOrders: zoneOrders
      } as ZoneCoverageSnapshot;
    });
  }

  async syncDriverInventory(input: DriverInventorySyncInput): Promise<DriverInventorySyncResult> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = new Date().toISOString();

    const normalizedEntries = new Map<string, { quantity: number; location_id?: string | null }>();
    for (const entry of input.entries || []) {
      if (!entry || !entry.product_id) continue;
      const quantity = Math.max(0, Math.round(Number(entry.quantity) || 0));
      const existing = normalizedEntries.get(entry.product_id) || { quantity: 0, location_id: entry.location_id };
      existing.quantity = quantity;
      if (typeof entry.location_id !== 'undefined') {
        existing.location_id = entry.location_id;
      }
      normalizedEntries.set(entry.product_id, existing);
    }

    const { data: currentRows, error: currentError } = await supabase
      .from('driver_inventory')
      .select('id, product_id, quantity, location_id')
      .eq('driver_id', driverId);

    if (currentError) throw currentError;

    const existingMap = new Map<string, { id: string; product_id: string; quantity: number; location_id?: string | null }>();
    (currentRows || []).forEach((row: any) => {
      existingMap.set(row.product_id, {
        id: row.id,
        product_id: row.product_id,
        quantity: row.quantity ?? 0,
        location_id: row.location_id ?? null
      });
    });

    const upserts: any[] = [];
    const deletions: { id: string; product_id: string; quantity: number }[] = [];
    const movements: { product_id: string; delta: number }[] = [];

    normalizedEntries.forEach((entry, productId) => {
      const existing = existingMap.get(productId);
      const locationId = entry.location_id ?? existing?.location_id ?? null;

      if (entry.quantity === 0) {
        if (existing) {
          deletions.push({ id: existing.id, product_id: productId, quantity: existing.quantity });
          movements.push({ product_id: productId, delta: -existing.quantity });
        }
        existingMap.delete(productId);
        return;
      }

      upserts.push({
        driver_id: driverId,
        product_id: productId,
        quantity: entry.quantity,
        location_id: locationId,
        updated_at: now
      });

      const previousQuantity = existing?.quantity ?? 0;
      const delta = entry.quantity - previousQuantity;
      if (delta !== 0) {
        movements.push({ product_id: productId, delta });
      }

      existingMap.delete(productId);
    });

    existingMap.forEach((row) => {
      deletions.push({ id: row.id, product_id: row.product_id, quantity: row.quantity });
      if (row.quantity !== 0) {
        movements.push({ product_id: row.product_id, delta: -row.quantity });
      }
    });

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('driver_inventory')
        .upsert(upserts, { onConflict: 'driver_id,product_id' });
      if (upsertError) throw upsertError;
    }

    if (deletions.length > 0) {
      const { error: deleteError } = await supabase
        .from('driver_inventory')
        .delete()
        .in('id', deletions.map((item) => item.id));
      if (deleteError) throw deleteError;
    }

    const touchedProducts = new Set<string>();
    upserts.forEach((item) => touchedProducts.add(item.product_id));
    deletions.forEach((item) => touchedProducts.add(item.product_id));

    for (const productId of touchedProducts) {
      await this.refreshProductStock(productId);
    }

    if (movements.length > 0) {
      const zoneId = typeof input.zone_id === 'undefined' ? null : input.zone_id;
      const baseDetails = input.note || 'Driver inventory sync';

      for (const movement of movements) {
        if (!movement.delta) continue;
        await this.recordDriverMovement({
          driver_id: driverId,
          zone_id: zoneId,
          product_id: movement.product_id,
          quantity_change: movement.delta,
          action: movement.delta > 0 ? 'inventory_added' : 'inventory_removed',
          details: `${baseDetails} (${movement.delta > 0 ? '+' : ''}${movement.delta})`
        });
      }
    }

    return { updated: upserts.length, removed: deletions.length };
  }

  async logDriverMovement(input: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string;
  }): Promise<void> {
    await this.recordDriverMovement(input);
  }

  async listDriverMovements(filters?: { driver_id?: string; zone_id?: string; limit?: number }): Promise<DriverMovementLog[]> {
    let query = supabase
      .from('driver_movements')
      .select('*');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(new Set(rows.map((row: any) => row.zone_id as string | null).filter((id): id is string => Boolean(id))));
    const productIds = Array.from(new Set(rows.map((row: any) => row.product_id as string | null).filter((id): id is string => Boolean(id))));

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    let productMap = new Map<string, Product>();
    if (productIds.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productError) throw productError;

      (productData || []).forEach((product: Product) => {
        productMap.set(product.id, product);
      });
    }

    return rows.map((row: any) => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      product_id: row.product_id,
      quantity_change: row.quantity_change,
      action: row.action,
      details: row.details,
      created_at: row.created_at,
      zone: row.zone_id ? zoneMap.get(row.zone_id) : undefined,
      product: row.product_id ? productMap.get(row.product_id) : undefined
    }));
  }

  // Orders with advanced filtering
  async listOrders(filters?: {
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    assignedDriver?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Order[]> {
    let query = supabase.from('orders').select('*');

    // Apply role-based filtering
    const profile = await this.getProfile();

    // Infrastructure owner can see all businesses
    if (profile.role !== 'infrastructure_owner') {
      // Business-scoped users must filter by active business context
      const businessContext = await this.getActiveBusinessContext();
      if (businessContext?.active_business_id) {
        query = query.eq('business_id', businessContext.active_business_id);
      }
    }

    // Sales role sees only their own orders within the business
    if (profile.role === 'sales') {
      query = query.eq('created_by', this.userTelegramId);
    }

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Text search
    if (filters?.q) {
      query = query.or(`customer_name.ilike.%${filters.q}%,customer_phone.ilike.%${filters.q}%,customer_address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%`);
    }

    // Date range filter
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Amount range filter
    if (filters?.minAmount) {
      query = query.gte('total_amount', filters.minAmount);
    }
    if (filters?.maxAmount) {
      query = query.lte('total_amount', filters.maxAmount);
    }

    // Assigned driver filter
    if (filters?.assignedDriver && filters.assignedDriver !== 'all') {
      query = query.eq('assigned_driver', filters.assignedDriver);
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getOrder(id: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createOrder(input: CreateOrderInput): Promise<{ id: string }> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must include at least one item');
    }

    // Get active business context
    const businessContext = await this.getActiveBusinessContext();
    if (!businessContext?.active_business_id) {
      const profile = await this.getProfile();
      if (profile.role !== 'infrastructure_owner') {
        throw new Error('\u05d0\u05d9\u05df \u05d4\u05e7\u05e9\u05e8 \u05e2\u05e1\u05e7\u05d9 \u05e4\u05e2\u05d9\u05dc - \u05d1\u05d7\u05e8 \u05e2\u05e1\u05e7 \u05db\u05d3\u05d9 \u05dc\u05d9\u05e6\u05d5\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4');
      }
    }

    const salespersonId = input.salesperson_id || this.userTelegramId;
    const status = input.status || 'new';
    const now = new Date().toISOString();
    const totalAmount = typeof input.total_amount === 'number'
      ? input.total_amount
      : input.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    const fallbackLocationId = await this.getCentralLocationId();

    interface InventorySnapshot {
      recordId: string;
      productId: string;
      locationId: string;
      previousOnHand: number;
      previousReserved: number;
      quantity: number;
      productName: string;
    }

    const validations: InventorySnapshot[] = [];

    for (const item of input.items) {
      const locationId = item.source_location || fallbackLocationId;

      if (!locationId) {
        throw new Error(`Missing inventory location for product ${item.product_name}`);
      }

      const { data: inventoryRecord, error: inventoryError } = await supabase
        .from('inventory')
        .select('id, on_hand_quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (inventoryError) throw inventoryError;

      if (!inventoryRecord) {
        throw new Error(`Inventory record not found for ${item.product_name} at location ${locationId}`);
      }

      const onHand = inventoryRecord.on_hand_quantity ?? 0;
      const reservedQuantity = inventoryRecord.reserved_quantity ?? 0;

      if (onHand < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.product_name} at location ${locationId}`);
      }

      validations.push({
        recordId: inventoryRecord.id,
        productId: item.product_id,
        locationId,
        previousOnHand: onHand,
        previousReserved: reservedQuantity,
        quantity: item.quantity,
        productName: item.product_name
      });
    }

    const payload = {
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_address: input.customer_address,
      notes: input.notes || null,
      delivery_date: input.delivery_date || null,
      status,
      items: input.items,
      total_amount: totalAmount,
      entry_mode: input.entry_mode,
      raw_order_text: input.raw_order_text || null,
      created_by: this.userTelegramId,
      salesperson_id: salespersonId,
      business_id: businessContext?.active_business_id || null,
      created_at: now,
      updated_at: now
    };

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert(payload)
      .select('id')
      .single();

    if (orderError) throw orderError;

    const orderId = orderRow.id;
    const processedAdjustments: InventorySnapshot[] = [];
    const inventoryLogs: string[] = [];
    const salesLogs: string[] = [];
    const productsToRefresh = new Set<string>();

    try {
      for (let index = 0; index < input.items.length; index += 1) {
        const item = input.items[index];
        const snapshot = validations[index];

        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            on_hand_quantity: snapshot.previousOnHand - snapshot.quantity,
            reserved_quantity: snapshot.previousReserved + snapshot.quantity,
            updated_at: now
          })
          .eq('id', snapshot.recordId);

        if (updateError) {
          throw updateError;
        }

        processedAdjustments.push(snapshot);

        const logId = await this.recordInventoryLog({
          product_id: snapshot.productId,
          change_type: 'reservation',
          quantity_change: -snapshot.quantity,
          from_location_id: snapshot.locationId,
          to_location_id: snapshot.locationId,
          reference_id: orderId,
          metadata: {
            entry_mode: input.entry_mode,
            salesperson_id: salespersonId,
            source_location: snapshot.locationId
          }
        });

        inventoryLogs.push(logId);

        const salesLogId = await this.recordSalesLog({
          product_id: snapshot.productId,
          location_id: snapshot.locationId,
          quantity: snapshot.quantity,
          total_amount: (item.price || 0) * snapshot.quantity,
          reference_id: orderId,
          recorded_by: salespersonId,
          sold_at: now,
          notes: `Order entry via ${input.entry_mode}`
        });

        salesLogs.push(salesLogId);
        productsToRefresh.add(snapshot.productId);
      }

      for (const productId of productsToRefresh) {
        await this.refreshProductStock(productId);
      }
    } catch (error) {
      // Attempt rollback for partial failures
      if (processedAdjustments.length > 0) {
        await Promise.all(
          processedAdjustments.reverse().map((adjustment) =>
            supabase
              .from('inventory')
              .update({
                on_hand_quantity: adjustment.previousOnHand,
                reserved_quantity: adjustment.previousReserved,
                updated_at: new Date().toISOString()
              })
              .eq('id', adjustment.recordId)
          )
        );
      }

      if (inventoryLogs.length > 0) {
        await supabase.from('inventory_logs').delete().in('id', inventoryLogs);
      }

      if (salesLogs.length > 0) {
        await supabase.from('sales_logs').delete().in('id', salesLogs);
      }

      await supabase.from('orders').delete().eq('id', orderId);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create order');
    }

    return { id: orderId };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // Tasks
  async listMyTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', this.userTelegramId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listAllTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createTask(input: Omit<Task, 'id' | 'created_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...input,
        assigned_by: this.userTelegramId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async completeTask(id: string, proof?: { photo?: string; location?: string; notes?: string }): Promise<void> {
    const updates: Partial<Task> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      location: proof?.location
    };

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  // Routes
  async getMyRoute(date: string): Promise<Route | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('driver_id', this.userTelegramId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createRoute(input: Omit<Route, 'id' | 'created_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('routes')
      .insert({
        ...input,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  // Communications
  async listGroupChats(): Promise<GroupChat[]> {
    const { data, error } = await supabase
      .from('group_chats')
      .select('*')
      .contains('members', [this.userTelegramId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .contains('subscribers', [this.userTelegramId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Notifications
  async createNotification(input: CreateNotificationInput): Promise<{ id: string }> {
    const payload = {
      recipient_id: input.recipient_id,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      action_url: input.action_url ?? null,
      read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', this.userTelegramId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', this.userTelegramId);

    if (error) throw error;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    return this.markNotificationRead(id);
  }

  async listNotifications(filters?: { limit?: number; unreadOnly?: boolean }): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', this.userTelegramId)
      .order('created_at', { ascending: false });

    if (filters?.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async listMessages(chatId: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async sendMessage(chatId: string, content: string, messageType: string = 'text'): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_telegram_id: this.userTelegramId,
        content,
        message_type: messageType,
        sent_at: new Date().toISOString(),
        is_deleted: false
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async editMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        content,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_telegram_id', this.userTelegramId);

    if (error) throw error;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_telegram_id', this.userTelegramId);

    if (error) throw error;
  }

  async getRoyalDashboardSnapshot(): Promise<RoyalDashboardSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const twelveHoursBack = 12;
    const ordersWindowStart = new Date(now.getTime() - twelveHoursBack * 60 * 60 * 1000);

    const ACTIVE_ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];

    const [ordersResult, driverStatusesResult, zonesResult, lowStockResult, restockResult, outstandingResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id,status,total_amount,created_at,updated_at,assigned_driver')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('driver_status')
        .select('driver_id,status,is_online,current_zone_id,last_updated')
        .order('last_updated', { ascending: false }),
      supabase
        .from('zones')
        .select('id,name,color,active')
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('inventory_low_stock_alerts')
        .select('product_id,product_name,location_id,location_name,on_hand_quantity,low_stock_threshold,triggered_at')
        .limit(12),
      supabase
        .from('restock_requests')
        .select('id,product_id,requested_quantity,status,created_at,product:products(name),to_location:inventory_locations(name)')
        .in('status', ['pending', 'approved', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('orders')
        .select('id,status,total_amount,created_at,assigned_driver')
        .in('status', ACTIVE_ORDER_STATUSES)
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (driverStatusesResult.error) throw driverStatusesResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (lowStockResult.error) throw lowStockResult.error;
    if (restockResult.error) throw restockResult.error;
    if (outstandingResult.error) throw outstandingResult.error;

    const recentOrders = ordersResult.data || [];
    const outstandingOrders = outstandingResult.data || [];
    const driverStatuses = driverStatusesResult.data || [];
    const zones = (zonesResult.data || []).filter((zone: any) => zone.active !== false);
    const lowStockAlerts: RoyalDashboardLowStockAlert[] = (lowStockResult.data || []).map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      location_id: row.location_id,
      location_name: row.location_name,
      on_hand_quantity: row.on_hand_quantity,
      low_stock_threshold: row.low_stock_threshold,
      triggered_at: row.triggered_at
    }));
    const restockQueue: RoyalDashboardRestockRequest[] = (restockResult.data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product?.name ?? null,
      requested_quantity: row.requested_quantity,
      status: row.status,
      requested_at: row.created_at,
      to_location_name: row.to_location?.name ?? null
    }));

    const deliveredToday = recentOrders.filter(order =>
      order.status === 'delivered' && new Date(order.created_at) >= startOfDay
    );
    const ordersToday = recentOrders.filter(order =>
      new Date(order.created_at) >= startOfDay && order.status !== 'cancelled'
    );

    const revenueToday = deliveredToday.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const averageOrderValue = deliveredToday.length > 0 ? revenueToday / deliveredToday.length : 0;
    const activeDrivers = driverStatuses.filter(status => status.is_online).length;

    const outstandingDeliveries = outstandingOrders.filter(order => order.status !== 'new').length;
    const pendingOrders = outstandingOrders.length;

    const driverZoneMap = new Map<string, string | null>();
    driverStatuses.forEach(status => {
      driverZoneMap.set(status.driver_id, status.current_zone_id || null);
    });

    const zonesCoverage: RoyalDashboardZoneCoverage[] = zones.map((zone: any) => {
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
        color: zone.color ?? null
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
      pendingOrders,
      activeDrivers,
      coveragePercent,
      outstandingDeliveries
    };

    const revenueTrend: RoyalDashboardChartPoint[] = [];
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dayStart = new Date(startOfDay);
      dayStart.setDate(startOfDay.getDate() - dayOffset);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayOrders = recentOrders.filter(order => {
        const createdAt = new Date(order.created_at);
        return createdAt >= dayStart && createdAt < dayEnd && order.status === 'delivered';
      });
      const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      revenueTrend.push({
        label: dayStart.toLocaleDateString('he-IL', { weekday: 'short' }),
        value: Number(dayRevenue.toFixed(2))
      });
    }

    const ordersPerHour: RoyalDashboardChartPoint[] = [];
    const recentOrders24h = recentOrders.filter(order => new Date(order.created_at) >= ordersWindowStart);
    for (let hour = twelveHoursBack - 1; hour >= 0; hour--) {
      const bucketStart = new Date(now.getTime() - hour * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
      const count = recentOrders24h.filter(order => {
        const createdAt = new Date(order.created_at);
        return createdAt >= bucketStart && createdAt < bucketEnd;
      }).length;
      ordersPerHour.push({
        label: bucketStart.toLocaleTimeString('he-IL', { hour: '2-digit' }),
        value: count
      });
    }

    const driverIds = new Set<string>();
    driverStatuses.forEach(status => driverIds.add(status.driver_id));
    outstandingOrders.forEach(order => {
      if (order.assigned_driver) {
        driverIds.add(order.assigned_driver);
      }
    });

    let driverProfiles: Record<string, { name?: string; photo_url?: string | null }> = {};
    if (driverIds.size > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('telegram_id,name,photo_url')
        .in('telegram_id', Array.from(driverIds));
      if (usersError) throw usersError;
      (usersData || []).forEach((user: any) => {
        driverProfiles[user.telegram_id] = {
          name: user.name,
          photo_url: user.photo_url
        };
      });
    }

    const agentOrdersCount = outstandingOrders.reduce<Record<string, number>>((acc, order) => {
      if (!order.assigned_driver) return acc;
      acc[order.assigned_driver] = (acc[order.assigned_driver] || 0) + 1;
      return acc;
    }, {});

    const agents: RoyalDashboardAgent[] = driverStatuses.map(status => ({
      id: status.driver_id,
      name: driverProfiles[status.driver_id]?.name || status.driver_id,
      status: status.is_online ? status.status : 'offline',
      zone: status.current_zone_id
        ? zones.find(zone => zone.id === status.current_zone_id)?.name || null
        : null,
      ordersInProgress: agentOrdersCount[status.driver_id] || 0,
      lastUpdated: status.last_updated,
      avatarUrl: driverProfiles[status.driver_id]?.photo_url || null
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

  // Bulk Operations
  async bulkUpdateOrderStatus(orderIds: string[], status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', orderIds);

    if (error) throw error;
  }

  async bulkAssignTasks(taskIds: string[], assignedTo: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ assigned_to: assignedTo })
      .in('id', taskIds);

    if (error) throw error;
  }

  async bulkUpdateProductPrices(productIds: string[], priceMultiplier: number): Promise<void> {
    // Get current products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, price')
      .in('id', productIds);

    if (fetchError) throw fetchError;

    // Update each product with new price
    const updates = products?.map(product => ({
      id: product.id,
      price: Math.round(product.price * priceMultiplier * 100) / 100,
      updated_at: new Date().toISOString()
    }));

    if (updates && updates.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(updates);

      if (error) throw error;
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', this.userTelegramId)
      .eq('read', false);

    if (error) throw error;
  }

  // Batch Operations
  async batchCreateProducts(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ ids: string[] }> {
    const now = new Date().toISOString();
    const productsWithTimestamps = products.map(product => ({
      ...product,
      created_at: now,
      updated_at: now
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsWithTimestamps)
      .select('id');

    if (error) throw error;
    return { ids: data?.map(p => p.id) || [] };
  }

  async batchCreateTasks(tasks: Omit<Task, 'id' | 'created_at'>[]): Promise<{ ids: string[] }> {
    const now = new Date().toISOString();
    const tasksWithTimestamps = tasks.map(task => ({
      ...task,
      assigned_by: this.userTelegramId,
      created_at: now
    }));

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksWithTimestamps)
      .select('id');

    if (error) throw error;
    return { ids: data?.map(t => t.id) || [] };
  }

  // Data Export
  async exportOrdersToCSV(filters?: any): Promise<string> {
    const orders = await this.listOrders(filters);

    const headers = ['ID', 'Customer', 'Phone', 'Address', 'Status', 'Total', 'Date'];
    const csvData = [
      headers.join(','),
      ...orders.map(order => [
        order.id,
        `"${order.customer_name}"`,
        order.customer_phone,
        `"${order.customer_address}"`,
        order.status,
        order.total_amount,
        new Date(order.created_at).toLocaleDateString('he-IL')
      ].join(','))
    ];

    return csvData.join('\n');
  }

  async exportProductsToCSV(): Promise<string> {
    const products = await this.listProducts();

    const headers = ['ID', 'Name', 'SKU', 'Price', 'Stock', 'Category', 'Location'];
    const csvData = [
      headers.join(','),
      ...products.map(product => [
        product.id,
        `"${product.name}"`,
        product.sku,
        product.price,
        product.stock_quantity,
        product.category,
        `"${product.warehouse_location || ''}"`
      ].join(','))
    ];

    return csvData.join('\n');
  }

  // Analytics helpers
  async getOrderStatsByDateRange(dateFrom: string, dateTo: string): Promise<any> {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (error) throw error;

    const stats = {
      totalOrders: data?.length || 0,
      totalRevenue: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
      statusBreakdown: {} as Record<string, number>,
      averageOrderValue: 0
    };

    data?.forEach(order => {
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
    });

    stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    return stats;
  }

  async getTopProducts(limit: number = 10): Promise<any[]> {
    // This would typically be done with a proper analytics table
    // For now, we'll analyze order items
    const orders = await this.listOrders();
    const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = {
            name: item.product_name,
            count: 0,
            revenue: 0
          };
        }
        productCounts[item.product_id].count += item.quantity;
        productCounts[item.product_id].revenue += item.quantity * item.price;
      });
    });

    return Object.entries(productCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Business Management Methods
  async listBusinesses(): Promise<any[]> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('active', true)
      .order('name_hebrew', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async getBusiness(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async listBusinessUsers(filters?: {
    business_id?: string;
    user_id?: string;
    role?: string;
    active_only?: boolean;
  }): Promise<any[]> {
    let query = supabase
      .from('business_users')
      .select(`
        *,
        user:users!business_users_user_id_fkey(telegram_id, name, username, photo_url, phone, role, department),
        business:businesses!business_users_business_id_fkey(id, name, name_hebrew, business_type, primary_color, secondary_color)
      `);

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.active_only) {
      query = query.eq('active', true);
    }

    query = query.order('assigned_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      business_id: row.business_id,
      user_id: row.user_id,
      role: row.role,
      permissions: row.permissions,
      is_primary: row.is_primary,
      active: row.active,
      assigned_at: row.assigned_at,
      assigned_by: row.assigned_by,
      user: row.user ? {
        telegram_id: row.user.telegram_id,
        name: row.user.name,
        username: row.user.username,
        photo_url: row.user.photo_url,
        phone: row.user.phone,
        role: row.user.role,
        department: row.user.department
      } : undefined,
      business: row.business ? {
        id: row.business.id,
        name: row.business.name,
        name_hebrew: row.business.name_hebrew,
        business_type: row.business.business_type,
        primary_color: row.business.primary_color,
        secondary_color: row.business.secondary_color
      } : undefined
    }));
  }

  async assignUserToBusiness(input: {
    business_id: string;
    user_id: string;
    role: any;
    is_primary?: boolean;
  }): Promise<{ id: string }> {
    const profile = await this.getProfile();

    // Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', input.user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!userExists) throw new Error('המשתמש לא נמצא במערכת');

    // Check if assignment already exists
    const { data: existing, error: existingError } = await supabase
      .from('business_users')
      .select('id')
      .eq('business_id', input.business_id)
      .eq('user_id', userExists.id)
      .eq('role', input.role)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      // Reactivate if exists
      const { error: updateError } = await supabase
        .from('business_users')
        .update({ active: true })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      return { id: existing.id };
    }

    // Get current user's ID for assigned_by
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', profile.telegram_id)
      .maybeSingle();

    if (currentUserError) throw currentUserError;

    // Create new assignment
    const { data, error } = await supabase
      .from('business_users')
      .insert({
        business_id: input.business_id,
        user_id: userExists.id,
        role: input.role,
        is_primary: input.is_primary || false,
        active: true,
        assigned_by: currentUser?.id,
        assigned_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return { id: data.id };
  }

  async updateBusinessUserRole(business_id: string, user_id: string, role: any): Promise<void> {
    // Get user's UUID from telegram_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) throw new Error('המשתמש לא נמצא');

    const { error } = await supabase
      .from('business_users')
      .update({ role })
      .eq('business_id', business_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async removeUserFromBusiness(business_id: string, user_id: string): Promise<void> {
    // Get user's UUID from telegram_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) throw new Error('המשתמש לא נמצא');

    const { error } = await supabase
      .from('business_users')
      .update({ active: false })
      .eq('business_id', business_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async listBusinessTypes(): Promise<BusinessType[]> {
    const { data, error } = await supabase
      .from('business_types')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async getBusinessType(id: string): Promise<BusinessType | null> {
    const { data, error } = await supabase
      .from('business_types')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async createBusinessType(input: Omit<BusinessType, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<{ id: string }> {
    console.log('🔄 createBusinessType: Starting...', input);

    // Get the current user's UUID from the users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', this.userTelegramId)
      .maybeSingle();

    if (userError) {
      console.error('❌ createBusinessType: Error fetching user:', userError);
      throw userError;
    }

    if (!user) {
      console.error('❌ createBusinessType: User not found for telegram_id:', this.userTelegramId);
      throw new Error('User not found');
    }

    console.log('✅ createBusinessType: Found user ID:', user.id);

    const { data, error } = await supabase
      .from('business_types')
      .insert({
        ...input,
        created_by: user.id
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ createBusinessType: Error inserting:', error);
      throw error;
    }

    console.log('✅ createBusinessType: Created business type:', data.id);
    return { id: data.id };
  }

  async updateBusinessType(id: string, updates: Partial<BusinessType>): Promise<void> {
    const { error } = await supabase
      .from('business_types')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteBusinessType(id: string): Promise<void> {
    const { error } = await supabase
      .from('business_types')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
  }

  async listAllUsers(): Promise<any[]> {
    console.log('📋 listAllUsers: Fetching all users from database...');

    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, name, username, photo_url, role, department, phone, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ listAllUsers: Error fetching users:', error);
      throw error;
    }

    console.log(`✅ listAllUsers: Loaded ${data?.length || 0} users from database:`, data);
    return data || [];
  }

  // Business Context Management Methods
  async getUserBusinesses(): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_user_businesses');

    if (error) {
      console.error('Failed to get user businesses:', error);
      throw error;
    }

    return data || [];
  }

  async getActiveBusinessContext(): Promise<any | null> {
    const profile = await this.getProfile();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', profile.telegram_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_business_context')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to get active business context:', error);
      return null;
    }

    return data;
  }

  async setActiveBusinessContext(business_id: string): Promise<void> {
    const { error } = await supabase
      .rpc('set_user_active_business', {
        p_business_id: business_id
      });

    if (error) {
      console.error('Failed to set active business context:', error);
      throw error;
    }
  }

  async updateBusinessUserOwnership(
    business_id: string,
    user_id: string,
    ownership_percentage: number
  ): Promise<void> {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) throw new Error('המשתמש לא נמצא');

    const { error } = await supabase
      .from('business_users')
      .update({
        ownership_percentage,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', business_id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // Direct Messaging and User Presence Functions

  async listAllUsersForMessaging(): Promise<User[]> {
    console.log('📋 listAllUsersForMessaging: Fetching all users for messaging...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ listAllUsersForMessaging: Error fetching users:', error);
      throw error;
    }

    console.log(`✅ listAllUsersForMessaging: Loaded ${data?.length || 0} users from database`);
    return (data || []).map((row: any) => ({
      telegram_id: row.telegram_id,
      role: row.role,
      name: row.name,
      username: row.username,
      photo_url: row.photo_url,
      department: row.department,
      phone: row.phone,
      business_id: row.business_id,
      last_active: row.last_active,
      online_status: row.online_status || 'offline',
      last_seen: row.last_seen
    }));
  }

  async getOrCreateDirectMessageRoom(otherUserTelegramId: string): Promise<string> {
    const businessContext = await this.getActiveBusinessContext();
    const businessId = businessContext?.active_business_id || null;

    const { data, error } = await supabase.rpc('get_or_create_dm_room', {
      p_user1_telegram_id: this.userTelegramId,
      p_user2_telegram_id: otherUserTelegramId,
      p_business_id: businessId
    });

    if (error) throw error;
    return data;
  }

  async listDirectMessageRooms(): Promise<any[]> {
    const { data, error } = await supabase
      .from('direct_message_participants')
      .select(`
        *,
        room:chat_rooms(
          id,
          name,
          last_message_at,
          last_message_preview,
          last_message_sender
        )
      `)
      .eq('telegram_id', this.userTelegramId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      room_id: row.room_id,
      other_telegram_id: row.other_telegram_id,
      unread_count: row.unread_count,
      last_read_at: row.last_read_at,
      room: row.room
    }));
  }

  async markDirectMessageAsRead(roomId: string): Promise<void> {
    const { error } = await supabase.rpc('reset_dm_unread_count', {
      p_room_id: roomId,
      p_telegram_id: this.userTelegramId
    });

    if (error) throw error;
  }

  async updateUserPresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        telegram_id: this.userTelegramId,
        status,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async getUserPresence(telegramId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createMessageReadReceipt(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('message_read_receipts')
      .insert({
        message_id: messageId,
        telegram_id: this.userTelegramId,
        read_at: new Date().toISOString()
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }

  async getMessageReadReceipts(messageId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('message_read_receipts')
      .select('*')
      .eq('message_id', messageId)
      .order('read_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export function createSupabaseDataStore(
  userTelegramId: string,
  authSession?: SupabaseAuthSessionPayload | null,
  initialUserData?: any
): DataStore {
  return new SupabaseDataStore(userTelegramId, authSession ?? null, initialUserData);
}
