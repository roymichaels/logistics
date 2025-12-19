const noOpQueryBuilder = {
  select: () => noOpQueryBuilder,
  insert: () => noOpQueryBuilder,
  update: () => noOpQueryBuilder,
  delete: () => noOpQueryBuilder,
  eq: () => noOpQueryBuilder,
  neq: () => noOpQueryBuilder,
  gt: () => noOpQueryBuilder,
  gte: () => noOpQueryBuilder,
  lt: () => noOpQueryBuilder,
  lte: () => noOpQueryBuilder,
  ilike: () => noOpQueryBuilder,
  like: () => noOpQueryBuilder,
  in: () => noOpQueryBuilder,
  order: () => noOpQueryBuilder,
  limit: () => noOpQueryBuilder,
  single: async () => ({ data: null, error: new Error('No backend - frontend-only mode') }),
  maybeSingle: async () => ({ data: null, error: null }),
  then: async (resolve: any) => resolve({ data: null, error: null }),
};

const mockSupabaseClient = {
  from: (table: string) => noOpQueryBuilder,
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
