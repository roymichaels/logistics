/**
 * DataClient Abstraction
 *
 * Provides a unified interface for data access that can be implemented
 * by different backends (Supabase, Mock, SXT, etc.)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface IDataClient {
  /**
   * Get a query builder for a table
   */
  from(table: string): any;

  /**
   * Call a Remote Procedure Call (RPC) function
   */
  rpc(fnName: string, params?: Record<string, any>): Promise<any>;

  /**
   * Access authentication methods
   */
  auth: {
    getUser(): Promise<{ data: { user: any } | null; error: any }>;
    getSession(): Promise<{ data: { session: any } | null; error: any }>;
    signOut(): Promise<{ error: any }>;
  };

  /**
   * Access storage methods
   */
  storage: {
    from(bucket: string): {
      upload(path: string, file: File | Blob, options?: any): Promise<{ data: any; error: any }>;
      download(path: string): Promise<{ data: any; error: any }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
      remove(paths: string[]): Promise<{ data: any; error: any }>;
    };
  };

  /**
   * Subscribe to real-time changes
   */
  channel(name: string): any;
}

/**
 * Supabase implementation of IDataClient
 */
export class SupabaseDataClient implements IDataClient {
  constructor(private client: SupabaseClient) {}

  from(table: string) {
    return this.client.from(table);
  }

  rpc(fnName: string, params?: Record<string, any>) {
    return this.client.rpc(fnName, params);
  }

  get auth() {
    return this.client.auth;
  }

  get storage() {
    return this.client.storage;
  }

  channel(name: string) {
    return this.client.channel(name);
  }
}

/**
 * Mock implementation of IDataClient for testing
 */
export class MockDataClient implements IDataClient {
  private mockData: Map<string, any[]> = new Map();

  from(table: string) {
    return {
      select: () => this.createMockBuilder(table),
      insert: (data: any) => this.createMockBuilder(table, { insert: data }),
      update: (data: any) => this.createMockBuilder(table, { update: data }),
      delete: () => this.createMockBuilder(table, { delete: true }),
    };
  }

  private createMockBuilder(table: string, operation?: any) {
    const builder = {
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      in: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return builder;
  }

  async rpc(fnName: string, params?: Record<string, any>) {
    return { data: null, error: null };
  }

  auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  };

  storage = {
    from: (bucket: string) => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: null }),
    }),
  };

  channel(name: string) {
    return {
      on: () => this,
      subscribe: () => this,
      unsubscribe: () => {},
    };
  }
}
