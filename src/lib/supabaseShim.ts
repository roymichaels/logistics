/**
 * Supabase No-Op Shim
 *
 * This module provides mock implementations of Supabase functionality
 * to allow the frontend-only application to run without Supabase dependencies.
 *
 * All methods return empty data or no-op functions to prevent runtime errors
 * while maintaining the expected API surface.
 */

import { logger } from './logger';

const SHIM_WARNING = '[Supabase Shim] This is a no-op implementation. Supabase is disabled in frontend-only mode.';

// Mock Supabase client types
export interface SupabaseClient {
  auth: AuthClient;
  from: (table: string) => QueryBuilder;
  storage: StorageClient;
  channel: (name: string) => RealtimeChannel;
  removeAllChannels: () => Promise<void>;
  removeChannel: (channel: RealtimeChannel) => Promise<void>;
}

export interface AuthClient {
  getSession: () => Promise<{ data: { session: null }; error: null }>;
  getUser: () => Promise<{ data: { user: null }; error: null }>;
  signUp: (credentials: any) => Promise<{ data: null; error: null }>;
  signInWithPassword: (credentials: any) => Promise<{ data: null; error: null }>;
  signInWithOAuth: (options: any) => Promise<{ data: null; error: null }>;
  signOut: () => Promise<{ error: null }>;
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
  updateUser: (updates: any) => Promise<{ data: null; error: null }>;
  resetPasswordForEmail: (email: string) => Promise<{ data: null; error: null }>;
  setSession: (session: any) => Promise<{ data: null; error: null }>;
}

export interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (data: any) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  upsert: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  neq: (column: string, value: any) => QueryBuilder;
  gt: (column: string, value: any) => QueryBuilder;
  gte: (column: string, value: any) => QueryBuilder;
  lt: (column: string, value: any) => QueryBuilder;
  lte: (column: string, value: any) => QueryBuilder;
  like: (column: string, pattern: string) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  is: (column: string, value: any) => QueryBuilder;
  in: (column: string, values: any[]) => QueryBuilder;
  contains: (column: string, value: any) => QueryBuilder;
  containedBy: (column: string, value: any) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  single: () => Promise<{ data: null; error: null }>;
  maybeSingle: () => Promise<{ data: null; error: null }>;
  csv: () => Promise<{ data: null; error: null }>;
  then: (resolve: (value: any) => void, reject?: (error: any) => void) => Promise<{ data: null; error: null }>;
}

export interface StorageClient {
  from: (bucket: string) => StorageBucket;
  listBuckets: () => Promise<{ data: []; error: null }>;
  getBucket: (name: string) => Promise<{ data: null; error: null }>;
  createBucket: (name: string, options?: any) => Promise<{ data: null; error: null }>;
  deleteBucket: (name: string) => Promise<{ data: null; error: null }>;
  emptyBucket: (name: string) => Promise<{ data: null; error: null }>;
}

export interface StorageBucket {
  upload: (path: string, file: File | Blob, options?: any) => Promise<{ data: null; error: null }>;
  download: (path: string) => Promise<{ data: null; error: null }>;
  list: (path?: string, options?: any) => Promise<{ data: []; error: null }>;
  remove: (paths: string[]) => Promise<{ data: null; error: null }>;
  createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: null; error: null }>;
  createSignedUrls: (paths: string[], expiresIn: number) => Promise<{ data: null; error: null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  move: (from: string, to: string) => Promise<{ data: null; error: null }>;
  copy: (from: string, to: string) => Promise<{ data: null; error: null }>;
}

export interface RealtimeChannel {
  on: (event: string, filter: any, callback: (payload: any) => void) => RealtimeChannel;
  subscribe: (callback?: (status: string) => void) => RealtimeChannel;
  unsubscribe: () => Promise<void>;
  send: (payload: any) => Promise<void>;
}

// Create mock query builder
class MockQueryBuilder implements QueryBuilder {
  private logOperation(operation: string, ...args: any[]) {
    logger.debug(`${SHIM_WARNING} - ${operation}`, args);
  }

  select(columns?: string): QueryBuilder {
    this.logOperation('select', columns);
    return this;
  }

  insert(data: any): QueryBuilder {
    this.logOperation('insert', data);
    return this;
  }

  update(data: any): QueryBuilder {
    this.logOperation('update', data);
    return this;
  }

  upsert(data: any): QueryBuilder {
    this.logOperation('upsert', data);
    return this;
  }

  delete(): QueryBuilder {
    this.logOperation('delete');
    return this;
  }

  eq(column: string, value: any): QueryBuilder {
    this.logOperation('eq', column, value);
    return this;
  }

  neq(column: string, value: any): QueryBuilder {
    this.logOperation('neq', column, value);
    return this;
  }

  gt(column: string, value: any): QueryBuilder {
    this.logOperation('gt', column, value);
    return this;
  }

  gte(column: string, value: any): QueryBuilder {
    this.logOperation('gte', column, value);
    return this;
  }

  lt(column: string, value: any): QueryBuilder {
    this.logOperation('lt', column, value);
    return this;
  }

  lte(column: string, value: any): QueryBuilder {
    this.logOperation('lte', column, value);
    return this;
  }

  like(column: string, pattern: string): QueryBuilder {
    this.logOperation('like', column, pattern);
    return this;
  }

  ilike(column: string, pattern: string): QueryBuilder {
    this.logOperation('ilike', column, pattern);
    return this;
  }

  is(column: string, value: any): QueryBuilder {
    this.logOperation('is', column, value);
    return this;
  }

  in(column: string, values: any[]): QueryBuilder {
    this.logOperation('in', column, values);
    return this;
  }

  contains(column: string, value: any): QueryBuilder {
    this.logOperation('contains', column, value);
    return this;
  }

  containedBy(column: string, value: any): QueryBuilder {
    this.logOperation('containedBy', column, value);
    return this;
  }

  range(from: number, to: number): QueryBuilder {
    this.logOperation('range', from, to);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder {
    this.logOperation('order', column, options);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.logOperation('limit', count);
    return this;
  }

  async single(): Promise<{ data: null; error: null }> {
    this.logOperation('single');
    return { data: null, error: null };
  }

  async maybeSingle(): Promise<{ data: null; error: null }> {
    this.logOperation('maybeSingle');
    return { data: null, error: null };
  }

  async csv(): Promise<{ data: null; error: null }> {
    this.logOperation('csv');
    return { data: null, error: null };
  }

  async then(resolve: (value: any) => void): Promise<{ data: null; error: null }> {
    const result = { data: null, error: null };
    resolve(result);
    return result;
  }
}

// Create mock storage bucket
class MockStorageBucket implements StorageBucket {
  constructor(private bucketName: string) {}

  async upload(path: string, file: File | Blob, options?: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - upload to ${this.bucketName}/${path}`);
    return { data: null, error: null };
  }

  async download(path: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - download from ${this.bucketName}/${path}`);
    return { data: null, error: null };
  }

  async list(path?: string, options?: any): Promise<{ data: []; error: null }> {
    logger.debug(`${SHIM_WARNING} - list ${this.bucketName}/${path || ''}`);
    return { data: [], error: null };
  }

  async remove(paths: string[]): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - remove from ${this.bucketName}`, paths);
    return { data: null, error: null };
  }

  async createSignedUrl(path: string, expiresIn: number): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - createSignedUrl ${this.bucketName}/${path}`);
    return { data: null, error: null };
  }

  async createSignedUrls(paths: string[], expiresIn: number): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - createSignedUrls ${this.bucketName}`, paths);
    return { data: null, error: null };
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    logger.debug(`${SHIM_WARNING} - getPublicUrl ${this.bucketName}/${path}`);
    return { data: { publicUrl: '' } };
  }

  async move(from: string, to: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - move in ${this.bucketName}`, from, to);
    return { data: null, error: null };
  }

  async copy(from: string, to: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - copy in ${this.bucketName}`, from, to);
    return { data: null, error: null };
  }
}

// Create mock storage client
class MockStorageClient implements StorageClient {
  from(bucket: string): StorageBucket {
    logger.debug(`${SHIM_WARNING} - storage.from('${bucket}')`);
    return new MockStorageBucket(bucket);
  }

  async listBuckets(): Promise<{ data: []; error: null }> {
    logger.debug(`${SHIM_WARNING} - listBuckets`);
    return { data: [], error: null };
  }

  async getBucket(name: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - getBucket('${name}')`);
    return { data: null, error: null };
  }

  async createBucket(name: string, options?: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - createBucket('${name}')`);
    return { data: null, error: null };
  }

  async deleteBucket(name: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - deleteBucket('${name}')`);
    return { data: null, error: null };
  }

  async emptyBucket(name: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - emptyBucket('${name}')`);
    return { data: null, error: null };
  }
}

// Create mock auth client
class MockAuthClient implements AuthClient {
  async getSession(): Promise<{ data: { session: null }; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.getSession`);
    return { data: { session: null }, error: null };
  }

  async getUser(): Promise<{ data: { user: null }; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.getUser`);
    return { data: { user: null }, error: null };
  }

  async signUp(credentials: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.signUp`);
    return { data: null, error: null };
  }

  async signInWithPassword(credentials: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.signInWithPassword`);
    return { data: null, error: null };
  }

  async signInWithOAuth(options: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.signInWithOAuth`);
    return { data: null, error: null };
  }

  async signOut(): Promise<{ error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.signOut`);
    return { error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    logger.debug(`${SHIM_WARNING} - auth.onAuthStateChange`);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            logger.debug(`${SHIM_WARNING} - auth subscription unsubscribed`);
          }
        }
      }
    };
  }

  async updateUser(updates: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.updateUser`);
    return { data: null, error: null };
  }

  async resetPasswordForEmail(email: string): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.resetPasswordForEmail`);
    return { data: null, error: null };
  }

  async setSession(session: any): Promise<{ data: null; error: null }> {
    logger.debug(`${SHIM_WARNING} - auth.setSession`);
    return { data: null, error: null };
  }
}

// Create mock realtime channel
class MockRealtimeChannel implements RealtimeChannel {
  constructor(private channelName: string) {}

  on(event: string, filter: any, callback: (payload: any) => void): RealtimeChannel {
    logger.debug(`${SHIM_WARNING} - channel('${this.channelName}').on('${event}')`);
    return this;
  }

  subscribe(callback?: (status: string) => void): RealtimeChannel {
    logger.debug(`${SHIM_WARNING} - channel('${this.channelName}').subscribe`);
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 0);
    }
    return this;
  }

  async unsubscribe(): Promise<void> {
    logger.debug(`${SHIM_WARNING} - channel('${this.channelName}').unsubscribe`);
  }

  async send(payload: any): Promise<void> {
    logger.debug(`${SHIM_WARNING} - channel('${this.channelName}').send`);
  }
}

// Create mock Supabase client
class MockSupabaseClient implements SupabaseClient {
  public auth: AuthClient;
  public storage: StorageClient;

  constructor() {
    logger.info(`${SHIM_WARNING} - Creating mock Supabase client`);
    this.auth = new MockAuthClient();
    this.storage = new MockStorageClient();
  }

  from(table: string): QueryBuilder {
    logger.debug(`${SHIM_WARNING} - from('${table}')`);
    return new MockQueryBuilder();
  }

  channel(name: string): RealtimeChannel {
    logger.debug(`${SHIM_WARNING} - channel('${name}')`);
    return new MockRealtimeChannel(name);
  }

  async removeAllChannels(): Promise<void> {
    logger.debug(`${SHIM_WARNING} - removeAllChannels`);
  }

  async removeChannel(channel: RealtimeChannel): Promise<void> {
    logger.debug(`${SHIM_WARNING} - removeChannel`);
  }
}

/**
 * Create a mock Supabase client
 * This replaces the real createClient function from @supabase/supabase-js
 */
export function createClient(url: string, key: string, options?: any): SupabaseClient {
  logger.info(`${SHIM_WARNING} - createClient called (returning mock)`);
  return new MockSupabaseClient();
}

/**
 * Export mock client instance for direct use
 */
export const supabaseClient = new MockSupabaseClient();

export default {
  createClient,
  supabaseClient
};
