export class SupabaseDataStoreAdapter {
  constructor(client?: any) {
    console.log('[STUB] SupabaseDataStoreAdapter - frontend-only mode');
  }

  async query() { return { data: [], error: null }; }
  async insert() { return { data: null, error: new Error('Frontend-only mode') }; }
  async update() { return { data: null, error: new Error('Frontend-only mode') }; }
  async delete() { return { data: null, error: new Error('Frontend-only mode') }; }
  subscribe() { return { unsubscribe: () => {} }; }
}
