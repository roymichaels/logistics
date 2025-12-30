import { logger } from './logger';
import type { DataStore } from '../data/types';

logger.warn('[SupabaseDataStore] Frontend-only mode - Supabase data store is not available');

export async function createSupabaseDataStore(
  userId: string,
  authSession?: any,
  user?: any
): Promise<DataStore> {
  logger.warn('[SupabaseDataStore] Attempted to create Supabase data store in frontend-only mode', {
    userId,
    hasSession: !!authSession,
    hasUser: !!user
  });

  throw new Error(
    'Supabase data store is not available in frontend-only mode. Please use the local data store instead.'
  );
}
