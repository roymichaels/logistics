import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and, like, desc } from 'drizzle-orm';
import { DataStore, User, Order, Task, Route } from './types';
import * as schema from './schema/sqlite';
import { readFileSync } from 'fs';

export class SqliteDataStore implements DataStore {
  private db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;

  constructor() {
    const dbPath = process.env.SQLITE_DB_PATH || './data.db';
    const keyPath = process.env.SQLITE_KEY_PATH || '/run/secrets/sqlite_key';
    
    let encryptionKey: string | undefined;
    try {
      encryptionKey = readFileSync(keyPath, 'utf8').trim();
    } catch (error) {
      console.warn('SQLCipher key not found, using unencrypted database');
    }

    this.sqlite = new Database(dbPath);
    
    // Configure SQLite pragmas
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('synchronous = NORMAL');
    this.sqlite.pragma('foreign_keys = ON');
    
    // Enable encryption if key is available
    if (encryptionKey) {
      this.sqlite.pragma(`key = '${encryptionKey}'`);
    }

    this.db = drizzle(this.sqlite, { schema });
    
    // Initialize schema
    this.initSchema();
  }

  private initSchema(): void {
    // Create tables if they don't exist
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('dispatcher', 'courier')),
        name TEXT,
        username TEXT,
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        created_by TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'enroute', 'delivered', 'failed')),
        customer TEXT NOT NULL,
        address TEXT NOT NULL,
        eta DATETIME,
        notes TEXT,
        items TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        courier_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'enroute', 'done', 'failed')),
        gps TEXT,
        proof_url TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        courier_id TEXT NOT NULL,
        date TEXT NOT NULL,
        stops TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(courier_id, date)
      );

      CREATE TABLE IF NOT EXISTS app_config (
        app TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_prefs (
        telegram_id TEXT,
        app TEXT,
        mode TEXT CHECK (mode IN ('demo', 'real')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (telegram_id, app)
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_courier_id ON tasks(courier_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);

    // Seed default config if not exists
    const existingConfig = this.sqlite.prepare('SELECT * FROM app_config WHERE app = ?').get('miniapp');
    if (!existingConfig) {
      const defaultConfig = {
        app: 'miniapp',
        adapters: { data: 'sqlite' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'Logistics Mini App',
          accent: '#007aff',
          theme: 'auto',
        },
        defaults: {
          mode: 'demo',
        },
      };

      this.sqlite.prepare('INSERT INTO app_config (app, config) VALUES (?, ?)').run(
        'miniapp',
        JSON.stringify(defaultConfig)
      );
    }
  }

  async getProfile(): Promise<User> {
    // In real implementation, get telegram_id from JWT context
    const telegram_id = 'mock_user_id';
    
    const user = this.sqlite.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;

    if (!user) {
      throw new Error('User not found');
    }

    return {
      telegram_id: user.telegram_id,
      role: user.role as 'dispatcher' | 'courier',
      name: user.name || undefined,
      username: user.username || undefined,
      photo_url: user.photo_url || undefined,
    };
  }

  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let query = 'SELECT * FROM orders';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.status && filters.status !== 'all') {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters?.q) {
      conditions.push('customer LIKE ?');
      params.push(`%${filters.q}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const orders = this.sqlite.prepare(query).all(...params) as any[];

    return orders.map(order => ({
      id: order.id,
      created_by: order.created_by,
      status: order.status as Order['status'],
      customer: order.customer,
      address: order.address,
      eta: order.eta || undefined,
      notes: order.notes || undefined,
      items: order.items ? JSON.parse(order.items) : undefined,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }));
  }

  async getOrder(id: string): Promise<Order> {
    const order = this.sqlite.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      id: order.id,
      created_by: order.created_by,
      status: order.status as Order['status'],
      customer: order.customer,
      address: order.address,
      eta: order.eta || undefined,
      notes: order.notes || undefined,
      items: order.items ? JSON.parse(order.items) : undefined,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    this.sqlite.prepare(`
      INSERT INTO orders (id, created_by, status, customer, address, eta, notes, items, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.created_by,
      input.status,
      input.customer,
      input.address,
      input.eta || null,
      input.notes || null,
      input.items ? JSON.stringify(input.items) : null,
      now,
      now
    );

    return { id };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.customer) {
      fields.push('customer = ?');
      params.push(updates.customer);
    }
    if (updates.address) {
      fields.push('address = ?');
      params.push(updates.address);
    }
    if (updates.eta !== undefined) {
      fields.push('eta = ?');
      params.push(updates.eta);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      params.push(updates.notes);
    }
    if (updates.items !== undefined) {
      fields.push('items = ?');
      params.push(updates.items ? JSON.stringify(updates.items) : null);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.sqlite.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  async listMyTasks(): Promise<Task[]> {
    // In real implementation, get courier_id from JWT context
    const courier_id = 'mock_courier_id';

    const tasks = this.sqlite.prepare('SELECT * FROM tasks WHERE courier_id = ? ORDER BY created_at DESC').all(courier_id) as any[];

    return tasks.map(task => ({
      id: task.id,
      order_id: task.order_id,
      courier_id: task.courier_id,
      status: task.status as Task['status'],
      gps: task.gps ? JSON.parse(task.gps) : undefined,
      proof_url: task.proof_url || undefined,
      completed_at: task.completed_at || undefined,
      created_at: task.created_at,
    }));
  }

  async completeTask(id: string, proof?: { photo?: string; qr?: string; gps?: { lat: number; lng: number } }): Promise<void> {
    const fields = ['status = ?', 'completed_at = ?'];
    const params = ['done', new Date().toISOString()];

    if (proof?.photo) {
      fields.push('proof_url = ?');
      params.push(proof.photo);
    }
    if (proof?.gps) {
      fields.push('gps = ?');
      params.push(JSON.stringify(proof.gps));
    }

    params.push(id);

    this.sqlite.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  async getMyRoute(date: string): Promise<Route | null> {
    // In real implementation, get courier_id from JWT context
    const courier_id = 'mock_courier_id';

    const route = this.sqlite.prepare('SELECT * FROM routes WHERE courier_id = ? AND date = ?').get(courier_id, date) as any;

    if (!route) {
      return null;
    }

    return {
      id: route.id,
      courier_id: route.courier_id,
      date: route.date,
      stops: route.stops ? JSON.parse(route.stops) : [],
    };
  }

  close(): void {
    this.sqlite.close();
  }
}