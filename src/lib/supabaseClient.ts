import { logger } from './logger';

// Mock Supabase Client - Frontend only, no backend connectivity
let client: any = null;
let initPromise: Promise<any> | null = null;
let isInitialized = false;

// Mock auth state
const mockAuthState = {
  user: null as any,
  session: null as any,
  listeners: [] as Array<(event: string, session: any) => void>
};

// Mock localStorage for sessions
const storageKey = 'twa-mock-session';

// Mock Supabase Client implementation
class MockSupabaseClient {
  auth = {
    getUser: async () => ({
      data: { user: mockAuthState.user },
      error: mockAuthState.user ? null : new Error('No user')
    }),
    getSession: async () => ({
      data: { session: mockAuthState.session },
      error: null
    }),
    setSession: async (session: any) => {
      mockAuthState.session = session;
      if (session?.user) {
        mockAuthState.user = session.user;
      }
      localStorage.setItem(storageKey, JSON.stringify(session));
      return { data: { session }, error: null };
    },
    signInWithPassword: async (credentials: any) => {
      const user = {
        id: 'mock-user-' + Date.now(),
        email: credentials.email,
        user_metadata: {},
        app_metadata: { roles: ['user'] }
      };
      const session = {
        access_token: 'mock-token-' + Math.random().toString(36),
        user,
        expires_in: 86400
      };
      mockAuthState.user = user;
      mockAuthState.session = session;
      localStorage.setItem(storageKey, JSON.stringify(session));
      this.listeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      mockAuthState.user = null;
      mockAuthState.session = null;
      localStorage.removeItem(storageKey);
      this.listeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    refreshSession: async () => {
      if (mockAuthState.session) {
        mockAuthState.session.access_token = 'mock-token-' + Math.random().toString(36);
      }
      return { data: { session: mockAuthState.session }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      this.listeners.push(callback);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    listeners: [] as Array<(event: string, session: any) => void>
  };

  from = (table: string) => ({
    select: (columns?: string) => ({
      eq: (col: string, val: any) => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: new Error('No rows') }),
        range: (start: number, end: number) => ({
          order: (col: string, opts?: any) => ({
            then: (cb: any) => cb({ data: [], error: null })
          })
        })
      }),
      order: (col: string, opts?: any) => ({
        limit: (n: number) => ({
          then: (cb: any) => cb({ data: [], error: null })
        }),
        then: (cb: any) => cb({ data: [], error: null })
      }),
      limit: (n: number) => ({
        then: (cb: any) => cb({ data: [], error: null })
      }),
      then: (cb: any) => cb({ data: [], error: null })
    }),
    insert: (data: any) => ({
      select: () => ({
        then: (cb: any) => cb({ data: Array.isArray(data) ? data : [data], error: null })
      }),
      then: (cb: any) => cb({ data: Array.isArray(data) ? data : [data], error: null })
    }),
    update: (data: any) => ({
      eq: (col: string, val: any) => ({
        then: (cb: any) => cb({ data: [data], error: null })
      })
    }),
    delete: () => ({
      eq: (col: string, val: any) => ({
        then: (cb: any) => cb({ data: [], error: null })
      })
    })
  });

  rpc = async (fn: string, params?: any) => ({
    data: null,
    error: null
  });

  channel = (name: string) => ({
    on: (event: string, opts: any, cb: any) => ({
      subscribe: async (cb2?: any) => {}
    }),
    subscribe: async () => {}
  });

  removeChannel = async (channel: any) => {};

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => ({
        data: { path },
        error: null
      }),
      download: async (path: string) => ({
        data: new Blob(),
        error: null
      }),
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `mock://storage/${path}` },
        error: null
      })
    })
  };
}

export async function initSupabase(): Promise<any> {
  if (isInitialized && client) {
    return client;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    logger.info('Initializing mock Supabase client (frontend-only mode)');

    // Restore session from localStorage if available
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const session = JSON.parse(stored);
        mockAuthState.session = session;
        mockAuthState.user = session.user;
        logger.info('Restored session from localStorage');
      }
    } catch (e) {
      logger.warn('Failed to restore session', e);
    }

    client = new MockSupabaseClient();
    isInitialized = true;

    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_INITIALIZED__ = true;
      window.dispatchEvent(new CustomEvent('supabase-ready'));
    }

    logger.info('Mock Supabase client initialized');
    return client;
  })();

  return initPromise;
}

export function getSupabase(): any {
  if (!client) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return client;
}

export function isSupabaseInitialized(): boolean {
  return isInitialized;
}

export async function waitForSupabaseInit(timeout: number = 5000): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(isInitialized);
    }, timeout);

    if (typeof window !== 'undefined') {
      const listener = () => {
        clearTimeout(timer);
        window.removeEventListener('supabase-ready', listener);
        resolve(true);
      };
      window.addEventListener('supabase-ready', listener);
    }
  });
}

// Lazy proxy for backward compatibility
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    if (!client) {
      throw new Error('Supabase not initialized');
    }
    return (client as any)[prop];
  }
});

export async function loadConfig() {
  return {
    supabaseUrl: '',
    supabaseAnonKey: ''
  };
}
