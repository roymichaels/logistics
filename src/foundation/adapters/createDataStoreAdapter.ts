import { IDataStore } from '../abstractions/IDataStore';
import { SupabaseDataStoreAdapter } from './SupabaseDataStoreAdapter';
import { SupabaseDataStoreShim } from './SupabaseDataStoreShim';
import { logger } from '../../lib/logger';
import { isSupabaseShimEnabled } from '../../lib/supabaseShimConfig';

export function createDataStoreAdapter(client?: any): IDataStore {
  const useShim = isSupabaseShimEnabled();

  if (useShim) {
    logger.info('Creating data store adapter: SupabaseDataStoreShim (IndexedDB-backed)');
    const shim = new SupabaseDataStoreShim();
    shim.initialize().catch((e) => {
      logger.warn('Failed to initialize IndexedDB for data store shim', e);
    });
    return shim;
  }

  if (!client) {
    throw new Error('Client required for SupabaseDataStoreAdapter');
  }

  logger.info('Creating data store adapter: SupabaseDataStoreAdapter (real Supabase)');
  return new SupabaseDataStoreAdapter(client);
}
