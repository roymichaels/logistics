/**
 * Base Service Class
 *
 * Provides common functionality for all service modules.
 * Each service extends this to inherit shared capabilities.
 */

import { SupabaseClient } from '../../lib/supabaseTypes';
import { getSupabase } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

export abstract class BaseService {
  protected userTelegramId: string;
  protected supabase: SupabaseClient;

  constructor(userTelegramId: string) {
    this.userTelegramId = userTelegramId;
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    this.supabase = supabase;
  }

  /**
   * Execute a query with error logging
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      const { data, error } = await queryFn();
      if (error) {
        logger.error(errorMessage, error);
        throw error;
      }
      return data;
    } catch (error) {
      logger.error(errorMessage, error as Error);
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
