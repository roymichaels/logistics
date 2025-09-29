import { DataStore, BootstrapConfig } from './types';

export async function createStore(cfg: BootstrapConfig, mode: 'demo' | 'real'): Promise<DataStore> {
  // Force demo mode if mock adapter is configured
  if (cfg.adapters.data === 'mock' || mode === 'demo') {
    const { MockDataStore } = await import('./mock');
    return new MockDataStore();
  }
  
  // Production adapters
  if (cfg.adapters.data === 'postgres') {
    const { PgDataStore } = await import('./pg');
    return new PgDataStore();
  }
  
  if (cfg.adapters.data === 'sqlite') {
    const { SqliteDataStore } = await import('./sqlite');
    return new SqliteDataStore();
  }
  
  // Fallback to mock if unknown adapter
  console.warn(`Unknown adapter: ${cfg.adapters.data}, falling back to mock`);
  const { MockDataStore } = await import('./mock');
  return new MockDataStore();
}

export * from './types';

export { createStore }