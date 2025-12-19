/**
 * Base Service Class
 *
 * Provides common functionality for all service modules.
 * Each service extends this to inherit shared capabilities.
 */

import { frontendOnlyDataStore } from '../../lib/frontendOnlyDataStore';
import { logger } from '../../lib/logger';

export abstract class BaseService {
  protected userId: string;
  protected dataStore = frontendOnlyDataStore;

  constructor(userId: string) {
    this.userId = userId;
    logger.debug(`[FRONTEND-ONLY] BaseService initialized for user ${userId}`);
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
