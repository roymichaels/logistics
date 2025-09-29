import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, like, desc } from 'drizzle-orm';
import { DataStore, User, Order, Task, Route } from './types';
import * as schema from './schema/pg';

export class PgDataStore implements DataStore {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for Postgres adapter');
    }

    this.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async getProfile(): Promise<User> {
    // In real implementation, get telegram_id from JWT context
    const telegram_id = 'mock_user_id';
    
    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.telegram_id, telegram_id))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    return {
      telegram_id: user[0].telegram_id,
      role: user[0].role as 'dispatcher' | 'courier',
      name: user[0].name || undefined,
      username: user[0].username || undefined,
      photo_url: user[0].photo_url || undefined,
    };
  }

  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let query = this.db.select().from(schema.orders);

    const conditions = [];
    
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(schema.orders.status, filters.status));
    }
    
    if (filters?.q) {
      conditions.push(
        like(schema.orders.customer, `%${filters.q}%`)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const orders = await query.orderBy(desc(schema.orders.created_at));

    return orders.map(order => ({
      id: order.id,
      created_by: order.created_by,
      status: order.status as Order['status'],
      customer: order.customer,
      address: order.address,
      eta: order.eta || undefined,
      notes: order.notes || undefined,
      items: order.items ? JSON.parse(order.items) : undefined,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
    }));
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);

    if (order.length === 0) {
      throw new Error('Order not found');
    }

    const o = order[0];
    return {
      id: o.id,
      created_by: o.created_by,
      status: o.status as Order['status'],
      customer: o.customer,
      address: o.address,
      eta: o.eta || undefined,
      notes: o.notes || undefined,
      items: o.items ? JSON.parse(o.items) : undefined,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString(),
    };
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.db.insert(schema.orders).values({
      id,
      created_by: input.created_by,
      status: input.status,
      customer: input.customer,
      address: input.address,
      eta: input.eta || null,
      notes: input.notes || null,
      items: input.items ? JSON.stringify(input.items) : null,
      created_at: now,
      updated_at: now,
    });

    return { id };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (updates.status) updateData.status = updates.status;
    if (updates.customer) updateData.customer = updates.customer;
    if (updates.address) updateData.address = updates.address;
    if (updates.eta !== undefined) updateData.eta = updates.eta;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.items !== undefined) updateData.items = updates.items ? JSON.stringify(updates.items) : null;

    await this.db
      .update(schema.orders)
      .set(updateData)
      .where(eq(schema.orders.id, id));
  }

  async listMyTasks(): Promise<Task[]> {
    // In real implementation, get courier_id from JWT context
    const courier_id = 'mock_courier_id';

    const tasks = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.courier_id, courier_id))
      .orderBy(desc(schema.tasks.created_at));

    return tasks.map(task => ({
      id: task.id,
      order_id: task.order_id,
      courier_id: task.courier_id,
      status: task.status as Task['status'],
      gps: task.gps ? JSON.parse(task.gps) : undefined,
      proof_url: task.proof_url || undefined,
      completed_at: task.completed_at?.toISOString() || undefined,
      created_at: task.created_at.toISOString(),
    }));
  }

  async completeTask(id: string, proof?: { photo?: string; qr?: string; gps?: { lat: number; lng: number } }): Promise<void> {
    const updateData: any = {
      status: 'done',
      completed_at: new Date(),
    };

    if (proof?.photo) updateData.proof_url = proof.photo;
    if (proof?.gps) updateData.gps = JSON.stringify(proof.gps);

    await this.db
      .update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, id));
  }

  async getMyRoute(date: string): Promise<Route | null> {
    // In real implementation, get courier_id from JWT context
    const courier_id = 'mock_courier_id';

    const route = await this.db
      .select()
      .from(schema.routes)
      .where(and(
        eq(schema.routes.courier_id, courier_id),
        eq(schema.routes.date, date)
      ))
      .limit(1);

    if (route.length === 0) {
      return null;
    }

    const r = route[0];
    return {
      id: r.id,
      courier_id: r.courier_id,
      date: r.date,
      stops: r.stops ? JSON.parse(r.stops) : [],
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}