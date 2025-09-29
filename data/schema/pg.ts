import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  telegram_id: text('telegram_id').primaryKey(),
  role: text('role').notNull(),
  name: text('name'),
  username: text('username'),
  photo_url: text('photo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  created_by: text('created_by').notNull(),
  status: text('status').notNull(),
  customer: text('customer').notNull(),
  address: text('address').notNull(),
  eta: timestamp('eta'),
  notes: text('notes'),
  items: text('items'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: text('order_id').notNull(),
  courier_id: text('courier_id').notNull(),
  status: text('status').notNull(),
  gps: text('gps'),
  proof_url: text('proof_url'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courier_id: text('courier_id').notNull(),
  date: text('date').notNull(),
  stops: text('stops'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const appConfig = pgTable('app_config', {
  app: text('app').primaryKey(),
  config: jsonb('config').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const userPrefs = pgTable('user_prefs', {
  telegram_id: text('telegram_id').notNull(),
  app: text('app').notNull(),
  mode: text('mode').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});