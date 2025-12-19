import { IDataStore } from '../abstractions/IDataStore';
import { logger } from '../../lib/logger';

class FrontendOnlyDataStore implements IDataStore {
  async query() { return { data: [], error: null }; }
  async insert() { return { data: null, error: new Error('Frontend-only mode') }; }
  async update() { return { data: null, error: new Error('Frontend-only mode') }; }
  async delete() { return { data: null, error: new Error('Frontend-only mode') }; }
  subscribe() { return { unsubscribe: () => {} }; }
}

export function createDataStoreAdapter(client?: any): IDataStore {
  logger.info('Creating data store adapter: FrontendOnlyDataStore (no Supabase)');
  return new FrontendOnlyDataStore();
}
