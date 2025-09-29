import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  telegram_id: text('telegram_id').primaryKey(),
  role: text('role').notNull(),
  name: text('name'),
  username: text('username'),
  photo_url: text('photo_url'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  created_by: text('created_by').notNull(),
  status: text('status').notNull(),
  customer: text('customer').notNull(),
  address: text('address').notNull(),
  eta: text('eta'),
  notes: text('notes'),
  items: text('items'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull(),
  courier_id: text('courier_id').notNull(),
  status: text('status').notNull(),
  gps: text('gps'),
  proof_url: text('proof_url'),
  completed_at: text('completed_at'),
  created_at: text('created_at'),
});

export const routes = sqliteTable('routes', {
  id: text('id').primaryKey(),
  courier_id: text('courier_id').notNull(),
  date: text('date').notNull(),
  stops: text('stops'),
  created_at: text('created_at'),
});

export const appConfig = sqliteTable('app_config', {
  app: text('app').primaryKey(),
  config: text('config').notNull(),
  updated_at: text('updated_at'),
});

export const userPrefs = sqliteTable('user_prefs', {
  telegram_id: text('telegram_id').notNull(),
  app: text('app').notNull(),
  mode: text('mode').notNull(),
  updated_at: text('updated_at'),
});