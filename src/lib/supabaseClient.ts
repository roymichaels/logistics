import { SupabaseDataStoreAdapter } from '../foundation/adapters/SupabaseDataStoreAdapter';

const mockSupabaseClient = {
  from: (table: string) => {
    const adapter = new SupabaseDataStoreAdapter();
    return adapter.from(table);
  },
  auth: {
    signUp: async () => ({ user: null, session: null, error: new Error('Frontend-only mode') }),
    signInWithPassword: async () => ({ user: null, session: null, error: new Error('Frontend-only mode') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    setSession: async () => ({ data: { session: null }, error: null }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      callback('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  storage: {
    from: (bucket: string) => ({
      upload: async () => ({ data: null, error: new Error('Frontend-only mode') }),
      download: async () => ({ data: null, error: new Error('Frontend-only mode') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: null }),
    }),
  },
};

let isInitialized = false;

export async function initSupabase(): Promise<any> {
  isInitialized = true;
  return mockSupabaseClient;
}

export function getSupabase(): any {
  return mockSupabaseClient;
}

export const supabase: any = mockSupabaseClient;
export const supabaseClient: any = mockSupabaseClient;

export function isSupabaseInitialized(): boolean {
  return true;
}

export async function waitForSupabaseInit(): Promise<void> {
  return Promise.resolve();
}

export async function loadConfig(): Promise<void> {
  return Promise.resolve();
}
