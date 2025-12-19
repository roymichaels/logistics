import { IDataStore } from '../abstractions/IDataStore';
import { SupabaseDataStoreAdapter } from './SupabaseDataStoreAdapter';
import { logger } from '../../lib/logger';

export function createDataStoreAdapter(client?: any): IDataStore {
  if (!client) {
    throw new Error('Client required for SupabaseDataStoreAdapter');
  }

  logger.info('Creating data store adapter: SupabaseDataStoreAdapter');
  return new SupabaseDataStoreAdapter(client);
}
