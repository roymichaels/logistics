/**
 * Base Service Class
 *
 * Provides common functionality for all service modules.
 * Each service extends this to inherit shared capabilities.
 */

import { supabase } from '../../lib/supabase';
import { runtimeRegistry } from '../../lib/runtime-registry';
import { SupabaseDataClient, type IDataClient } from '../../foundation/abstractions/IDataClient';

export abstract class BaseService {
  protected userId: string;
  protected client: IDataClient;
  protected supabase: any;

  constructor(userId: string, client?: IDataClient) {
    this.userId = userId;
    this.client = client || new SupabaseDataClient(supabase);
    this.supabase = this.client;
  }

  /**
   * Execute a query with error tracking via runtime registry
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T | null> {
    const startTime = Date.now();
    const serviceName = this.constructor.name;

    try {
      const { data, error } = await queryFn();
      const duration = Date.now() - startTime;

      if (error) {
        runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, true);
        throw error;
      }

      runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, false);
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, true);
      throw error;
    }
  }

  /**
   * Get current timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }
}
