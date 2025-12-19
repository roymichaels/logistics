import { logger } from './logger';

interface MockTableData {
  [table: string]: Record<string, any>[];
}

class FrontendOnlyDataStore {
  private data: MockTableData = {
    users: [],
    businesses: [],
    orders: [],
    products: [],
    driver_profiles: [],
    zones: [],
    inventory: [],
    messages: [],
    posts: [],
    user_follows: [],
    user_profiles: [],
    business_memberships: [],
    user_active_contexts: [],
    payment_transactions: [],
    order_items: [],
    product_categories: [],
    product_variants: [],
    driver_status: [],
    driver_locations: [],
    driver_inventory: [],
    driver_movements: [],
    driver_zones: [],
    shopping_carts: [],
    cart_items: [],
    customer_addresses: [],
    order_assignments: [],
    order_status_history: [],
    order_notifications: [],
    chat_rooms: [],
    post_media: [],
    post_likes: [],
    post_reposts: [],
    post_comments: [],
    post_bookmarks: [],
    post_hashtags: [],
    user_blocks: [],
    user_mutes: [],
    hashtags: [],
    trending_topics: [],
    infrastructure_feature_flags: [],
    restock_requests: [],
    inventory_locations: [],
    inventory_logs: [],
    inventory_low_stock_alerts: [],
    sales_logs: [],
    profit_distributions: [],
    equity_transactions: [],
    business_equity: [],
    storefront_settings: [],
    storefront_pages: [],
    storefront_navigation: [],
    storefront_banners: [],
    product_categories_backup: [],
    product_reviews: [],
    product_images: [],
    product_tags: [],
    product_tag_assignments: [],
    zone_audit_logs: [],
    user_business_roles: [],
    infrastructures: [],
    crypto_wallets: [],
    telegram_integration: [],
    commission_ledger: [],
    driver_payouts: [],
  };

  constructor() {
    logger.info('[FRONTEND-ONLY] DataStore initialized - no database connections');
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('frontend-data-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.data = { ...this.data, ...parsed };
        logger.debug('[FRONTEND-ONLY] Data restored from localStorage');
      }
    } catch (error) {
      logger.error('[FRONTEND-ONLY] Failed to load from localStorage', error);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('frontend-data-store', JSON.stringify(this.data));
    } catch (error) {
      logger.error('[FRONTEND-ONLY] Failed to save to localStorage', error);
    }
  }

  async query(table: string, filters?: Record<string, any>): Promise<any[]> {
    await this.delay();
    const tableData = this.data[table] || [];

    if (!filters) {
      return tableData;
    }

    return tableData.filter(row =>
      Object.entries(filters).every(([key, value]) => row[key] === value)
    );
  }

  async insert(table: string, data: any | any[]): Promise<{ data: any; error: null } | { data: null; error: Error }> {
    await this.delay();

    try {
      if (!this.data[table]) {
        this.data[table] = [];
      }

      const rows = Array.isArray(data) ? data : [data];
      const withIds = rows.map(row => ({
        id: row.id || this.generateId(),
        ...row,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      this.data[table].push(...withIds);
      this.saveToLocalStorage();

      return { data: Array.isArray(data) ? withIds : withIds[0], error: null };
    } catch (error) {
      logger.error(`[FRONTEND-ONLY] Insert failed for ${table}`, error);
      return { data: null, error: error as Error };
    }
  }

  async update(table: string, id: string, data: any): Promise<{ data: any; error: null } | { data: null; error: Error }> {
    await this.delay();

    try {
      if (!this.data[table]) {
        return { data: null, error: new Error(`Table ${table} not found`) };
      }

      const index = this.data[table].findIndex(row => row.id === id);
      if (index === -1) {
        return { data: null, error: new Error(`Record ${id} not found`) };
      }

      this.data[table][index] = {
        ...this.data[table][index],
        ...data,
        updated_at: new Date().toISOString(),
      };

      this.saveToLocalStorage();
      return { data: this.data[table][index], error: null };
    } catch (error) {
      logger.error(`[FRONTEND-ONLY] Update failed for ${table}`, error);
      return { data: null, error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<{ data: null; error: null } | { data: null; error: Error }> {
    await this.delay();

    try {
      if (!this.data[table]) {
        return { data: null, error: new Error(`Table ${table} not found`) };
      }

      const index = this.data[table].findIndex(row => row.id === id);
      if (index === -1) {
        return { data: null, error: new Error(`Record ${id} not found`) };
      }

      this.data[table].splice(index, 1);
      this.saveToLocalStorage();
      return { data: null, error: null };
    } catch (error) {
      logger.error(`[FRONTEND-ONLY] Delete failed for ${table}`, error);
      return { data: null, error: error as Error };
    }
  }

  async batchInsert(table: string, rows: any[]): Promise<{ data: any[]; error: null } | { data: null; error: Error }> {
    await this.delay();

    try {
      if (!this.data[table]) {
        this.data[table] = [];
      }

      const withIds = rows.map(row => ({
        id: row.id || this.generateId(),
        ...row,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      this.data[table].push(...withIds);
      this.saveToLocalStorage();
      return { data: withIds, error: null };
    } catch (error) {
      logger.error(`[FRONTEND-ONLY] Batch insert failed for ${table}`, error);
      return { data: null, error: error as Error };
    }
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    logger.debug(`[FRONTEND-ONLY] Subscription requested for ${table} (no-op)`);
    return () => {
      logger.debug(`[FRONTEND-ONLY] Subscription closed for ${table}`);
    };
  }

  async storage() {
    return {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => {
          logger.warn(`[FRONTEND-ONLY] Storage upload attempted for ${bucket}/${path} - no-op`);
          return { data: { path }, error: null };
        },
        download: async (path: string) => {
          logger.warn(`[FRONTEND-ONLY] Storage download attempted for ${bucket}/${path} - no-op`);
          return { data: null, error: new Error('Storage not available') };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `blob://${bucket}/${path}` },
          error: null,
        }),
        remove: async (paths: string[]) => {
          logger.warn(`[FRONTEND-ONLY] Storage remove attempted - no-op`);
          return { data: null, error: null };
        },
      }),
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 5));
  }

  clearAll() {
    this.data = Object.keys(this.data).reduce((acc, key) => ({
      ...acc,
      [key]: [],
    }), {});
    localStorage.removeItem('frontend-data-store');
    logger.info('[FRONTEND-ONLY] All data cleared');
  }

  getStats() {
    return Object.entries(this.data).reduce((acc, [table, rows]) => ({
      ...acc,
      [table]: rows.length,
    }), {} as Record<string, number>);
  }
}

export const frontendOnlyDataStore = new FrontendOnlyDataStore();
