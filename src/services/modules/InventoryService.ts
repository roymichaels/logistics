/**
 * Inventory Service
 *
 * Handles all inventory-related operations:
 * - Product management
 * - Inventory tracking
 * - Restock requests
 * - Inventory transfers
 * - Sales logging
 */

import { BaseService } from '../base/BaseService';
import {
  Product,
  InventoryRecord,
  InventoryLocation,
  InventoryBalanceSummary,
  LocationInventoryBalance,
  RestockRequest,
  RestockRequestInput,
  RestockApprovalInput,
  RestockFulfillmentInput,
  RestockRequestStatus,
  InventoryTransferInput,
  InventoryLog,
  InventoryLogType,
  SalesLog,
  SalesLogInput,
  InventoryAlert,
  RolePermissions,
  InventoryBalanceRow,
  RestockRequestRow,
  DriverInventoryRow
} from '../../data/types';

export class InventoryService extends BaseService {
  // Products
  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    let query = this.supabase.from('products').select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.q) {
      query = query.ilike('name', `%${filters.q}%`);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getProduct(id: string): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const now = this.now();

    const { data, error } = await this.supabase
      .from('products')
      .insert({
        ...input,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .update({
        ...updates,
        updated_at: this.now()
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Inventory
  async listInventory(filters?: {
    location_id?: string;
    product_id?: string;
    low_stock?: boolean;
  }): Promise<InventoryRecord[]> {
    let query = this.supabase
      .from('inventory')
      .select('*, product:products(*), location:inventory_locations(*)');

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.low_stock) {
      query = query.lt('on_hand_quantity', this.supabase.raw('low_stock_threshold'));
    }

    query = query.order('product_id', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      on_hand_quantity: row.on_hand_quantity ?? 0,
      reserved_quantity: row.reserved_quantity ?? 0,
      damaged_quantity: row.damaged_quantity ?? 0,
      low_stock_threshold: row.low_stock_threshold ?? 0,
      updated_at: row.updated_at,
      product: row.product || undefined,
      location: row.location || undefined
    }));
  }

  async getInventory(productId: string, locationId?: string): Promise<InventoryRecord | null> {
    let query = this.supabase
      .from('inventory')
      .select('*, product:products(*), location:inventory_locations(*)')
      .eq('product_id', productId);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      product_id: data.product_id,
      location_id: data.location_id,
      on_hand_quantity: data.on_hand_quantity ?? 0,
      reserved_quantity: data.reserved_quantity ?? 0,
      damaged_quantity: data.damaged_quantity ?? 0,
      low_stock_threshold: data.low_stock_threshold ?? 0,
      updated_at: data.updated_at,
      product: data.product || undefined,
      location: data.location || undefined
    };
  }

  async listInventoryLocations(): Promise<InventoryLocation[]> {
    const { data, error } = await this.supabase
      .from('inventory_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getInventorySummary(productId: string): Promise<InventoryBalanceSummary> {
    const [inventoryResponse, driverResponse, restockResponse, productResponse] = await Promise.all([
      this.supabase
        .from('inventory')
        .select('location_id, on_hand_quantity, reserved_quantity, damaged_quantity, updated_at, location:inventory_locations(id, name)')
        .eq('product_id', productId),
      this.supabase
        .from('driver_inventory')
        .select('driver_id, product_id, quantity, location_id, updated_at')
        .eq('product_id', productId),
      this.supabase
        .from('restock_requests')
        .select('*')
        .eq('product_id', productId)
        .in('status', ['pending', 'approved']),
      this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle()
    ]);

    if (inventoryResponse.error) throw inventoryResponse.error;
    if (driverResponse.error) throw driverResponse.error;
    if (restockResponse.error) throw restockResponse.error;
    if (productResponse.error) throw productResponse.error;

    const inventoryRows = inventoryResponse.data || [];
    const driverRows = driverResponse.data || [];
    const restockRows = restockResponse.data || [];

    const locations: LocationInventoryBalance[] = inventoryRows.map((row: InventoryBalanceRow) => {
      const pending = restockRows
        .filter((request: RestockRequestRow) => request.to_location_id === row.location_id)
        .reduce((sum: number, request: RestockRequestRow) => sum + (request.requested_quantity ?? 0), 0);

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

    const drivers = driverRows.map((row: DriverInventoryRow) => ({
      driver_id: row.driver_id,
      product_id: row.product_id,
      quantity: row.quantity ?? 0,
      location_id: row.location_id ?? null,
      updated_at: row.updated_at
    }));

    const total_driver_quantity = drivers.reduce((sum, driver) => sum + (driver.quantity ?? 0), 0);

    const lastUpdatedCandidates = [
      ...inventoryRows.map((row: InventoryBalanceRow) => row.updated_at),
      ...driverRows.map((row: DriverInventoryRow) => row.updated_at)
    ].filter(Boolean);

    const last_updated = lastUpdatedCandidates.length
      ? new Date(
          Math.max(
            ...lastUpdatedCandidates.map((date: string) => new Date(date).getTime())
          )
        ).toISOString()
      : undefined;

    const openRestockRequests: RestockRequest[] = restockRows.map((row: RestockRequestRow) => ({
      id: row.id,
      product_id: row.product_id,
      requested_by: row.requested_by,
      requested_quantity: row.requested_quantity,
      status: row.status as RestockRequestStatus,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
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

  // Restock Requests
  async listRestockRequests(filters?: {
    status?: RestockRequestStatus | 'all';
    onlyMine?: boolean;
    product_id?: string;
    location_id?: string;
  }): Promise<RestockRequest[]> {
    let query = this.supabase
      .from('restock_requests')
      .select(
        `*,
         product:products(*),
         from_location:inventory_locations!restock_requests_from_location_id_fkey(*),
         to_location:inventory_locations!restock_requests_to_location_id_fkey(*)`
      );

    if (filters?.onlyMine) {
      query = query.eq('requested_by', this.userTelegramId);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
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

    return (data || []).map((row: RestockRequestRow) => ({
      id: row.id,
      product_id: row.product_id,
      requested_by: row.requested_by,
      requested_quantity: row.requested_quantity,
      status: row.status as RestockRequestStatus,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  async submitRestockRequest(input: RestockRequestInput): Promise<{ id: string }> {
    const now = this.now();

    const { data, error } = await this.supabase
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
    return { id: data.id };
  }

  async approveRestockRequest(id: string, input: RestockApprovalInput): Promise<void> {
    const { error } = await this.supabase.rpc('approve_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_from_location_id: input.from_location_id,
      p_approved_quantity: input.approved_quantity,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async fulfillRestockRequest(id: string, input: RestockFulfillmentInput): Promise<void> {
    const { error } = await this.supabase.rpc('fulfill_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_fulfilled_quantity: input.fulfilled_quantity,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async rejectRestockRequest(id: string, input?: { notes?: string }): Promise<void> {
    const { error } = await this.supabase.rpc('reject_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_notes: input?.notes || null
    });

    if (error) throw error;
  }

  // Inventory Transfers
  async transferInventory(input: InventoryTransferInput): Promise<void> {
    if (input.quantity <= 0) {
      throw new Error('כמות ההעברה חייבת להיות גדולה מאפס');
    }

    if (input.from_location_id === input.to_location_id) {
      throw new Error('מקור ויעד ההעברה חייבים להיות שונים');
    }

    const { error } = await this.supabase.rpc('perform_inventory_transfer', {
      p_product_id: input.product_id,
      p_from_location_id: input.from_location_id,
      p_to_location_id: input.to_location_id,
      p_quantity: input.quantity,
      p_actor: this.userTelegramId,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  // Inventory Logs
  async listInventoryLogs(filters?: {
    product_id?: string;
    location_id?: string;
    limit?: number;
  }): Promise<InventoryLog[]> {
    let query = this.supabase
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

    return (data || []).map(row => ({
      id: row.id,
      product_id: row.product_id,
      change_type: row.change_type as InventoryLogType,
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

  // Sales Logs
  async listSalesLogs(filters?: { product_id?: string; location_id?: string; limit?: number }): Promise<SalesLog[]> {
    let query = this.supabase
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

    return (data || []).map(row => ({
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
    if (input.quantity <= 0) {
      throw new Error('כמות המכירה חייבת להיות גדולה מאפס');
    }

    const now = this.now();
    const { data, error } = await this.supabase
      .from('sales_logs')
      .insert({
        product_id: input.product_id,
        location_id: input.location_id,
        quantity: input.quantity,
        total_amount: input.total_amount,
        reference_id: input.reference_id ?? null,
        recorded_by: this.userTelegramId,
        sold_at: input.sold_at ?? now,
        notes: input.notes ?? null
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  // Low Stock Alerts
  async getLowStockAlerts(filters?: { location_id?: string }): Promise<InventoryAlert[]> {
    let query = this.supabase.from('inventory_low_stock_alerts').select('*');

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
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
}
