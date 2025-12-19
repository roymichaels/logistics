import { logger } from './logger';

const SESSION_KEY = 'twa-undergroundlab-session-v2';
const AUTH_STATE_KEY = 'twa-auth-state';

interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: MockUser;
}

interface MockUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

interface AuthStateChangeListener {
  callback: (event: string, session: MockSession | null) => void;
}

class MockSupabaseClient {
  private mockSession: MockSession | null = null;
  private authListeners: AuthStateChangeListener[] = [];
  private channels: Map<string, any> = new Map();

  constructor() {
    this.loadPersistedSession();
  }

  private loadPersistedSession() {
    try {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.mockSession = JSON.parse(stored);
        logger.info('Loaded persisted session from localStorage');
      }
    } catch (e) {
      logger.warn('Failed to load persisted session', e);
    }
  }

  private persistSession(session: MockSession | null) {
    try {
      if (typeof window === 'undefined') return;
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      logger.warn('Failed to persist session', e);
    }
  }

  private notifyAuthListeners(event: string, session: MockSession | null) {
    this.authListeners.forEach(listener => {
      try {
        listener.callback(event, session);
      } catch (e) {
        logger.error('Error in auth state change listener', e);
      }
    });
  }

  auth = {
    getUser: async () => {
      return {
        data: {
          user: this.mockSession?.user || null
        },
        error: null
      };
    },

    getSession: async () => {
      return {
        data: {
          session: this.mockSession || null
        },
        error: null
      };
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const mockUser: MockUser = {
        id: `user_${Date.now()}`,
        email: credentials.email,
        user_metadata: {},
        app_metadata: { role: 'user' }
      };

      const mockSession: MockSession = {
        access_token: `token_${Date.now()}`,
        refresh_token: `refresh_${Date.now()}`,
        expires_at: Date.now() + 3600000,
        user: mockUser
      };

      this.mockSession = mockSession;
      this.persistSession(mockSession);
      this.notifyAuthListeners('SIGNED_IN', mockSession);

      return {
        data: { session: mockSession, user: mockUser },
        error: null
      };
    },

    signOut: async () => {
      this.mockSession = null;
      this.persistSession(null);
      this.notifyAuthListeners('SIGNED_OUT', null);
      return { error: null };
    },

    setSession: async (session: { access_token: string; refresh_token: string }) => {
      const mockUser: MockUser = {
        id: `user_${Date.now()}`,
        user_metadata: {},
        app_metadata: { role: 'user' }
      };

      const mockSession: MockSession = {
        ...session,
        expires_at: Date.now() + 3600000,
        user: mockUser
      };

      this.mockSession = mockSession;
      this.persistSession(mockSession);
      this.notifyAuthListeners('SIGNED_IN', mockSession);

      return {
        data: { session: mockSession },
        error: null
      };
    },

    refreshSession: async () => {
      if (!this.mockSession) {
        return {
          data: { session: null },
          error: new Error('No session to refresh')
        };
      }

      const refreshedSession: MockSession = {
        ...this.mockSession,
        access_token: `token_${Date.now()}`,
        expires_at: Date.now() + 3600000
      };

      this.mockSession = refreshedSession;
      this.persistSession(refreshedSession);
      this.notifyAuthListeners('TOKEN_REFRESHED', refreshedSession);

      return {
        data: { session: refreshedSession },
        error: null
      };
    },

    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      const listener: AuthStateChangeListener = { callback };
      this.authListeners.push(listener);

      const unsubscribe = () => {
        this.authListeners = this.authListeners.filter(l => l !== listener);
      };

      return {
        data: { subscription: { unsubscribe } },
        subscription: { unsubscribe }
      };
    },

    updateUser: async (updates: Partial<MockUser>) => {
      if (!this.mockSession) {
        return { data: { user: null }, error: new Error('No session') };
      }

      this.mockSession.user = {
        ...this.mockSession.user,
        ...updates
      };
      this.persistSession(this.mockSession);

      return {
        data: { user: this.mockSession.user },
        error: null
      };
    }
  };

  from = (table: string) => {
    return {
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => ({ data: null, error: null }),
          then: async (callback: any) => callback({ data: [], error: null })
        }),
        then: async (callback: any) => callback({ data: [], error: null })
      }),
      insert: (data: any) => ({
        select: async () => ({ data: Array.isArray(data) ? data : [data], error: null }),
        then: async (callback: any) => callback({ data: Array.isArray(data) ? data : [data], error: null })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: async () => ({ data: [], error: null }),
          then: async (callback: any) => callback({ data: [], error: null })
        }),
        then: async (callback: any) => callback({ data: [], error: null })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (callback: any) => callback({ data: null, error: null })
        }),
        then: async (callback: any) => callback({ data: null, error: null })
      })
    };
  };

  rpc = async (functionName: string, params?: Record<string, any>) => {
    logger.warn(`Mock RPC call: ${functionName}`, params);
    return { data: null, error: null };
  };

  channel = (name: string) => {
    const subscribers: Function[] = [];

    return {
      on: (event: string, filter: any, callback: Function) => {
        subscribers.push(callback);
        return this.channels.set(name, {
          on: this.channel,
          subscribe: () => ({
            unsubscribe: () => {
              this.channels.delete(name);
            }
          })
        });
      },
      subscribe: () => ({
        unsubscribe: () => {
          this.channels.delete(name);
        }
      })
    };
  };

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
      list: async (path?: string) => ({
        data: [],
        error: null
      }),
      remove: async (paths: string[]) => ({
        data: [],
        error: null
      })
    })
  };

  supabaseUrl = '';
  supabaseKey = '';
}

let shimClient: MockSupabaseClient | null = null;
let isInitialized = false;

export async function initSupabaseShim(): Promise<MockSupabaseClient> {
  if (shimClient && isInitialized) {
    return shimClient;
  }

  shimClient = new MockSupabaseClient();
  isInitialized = true;

  if (typeof window !== 'undefined') {
    (window as any).__SUPABASE_INITIALIZED__ = true;
    (window as any).__SUPABASE_CLIENT__ = shimClient;
    window.dispatchEvent(new Event('supabase-ready'));
  }

  logger.info('Supabase shim initialized (no-op client using localStorage for auth)');
  return shimClient;
}

export function getSupabaseShim(): MockSupabaseClient {
  if (!shimClient || !isInitialized) {
    throw new Error('Supabase shim not initialized. Call initSupabaseShim() first.');
  }
  return shimClient;
}

export function isSupabaseShimInitialized(): boolean {
  return isInitialized && shimClient !== null;
}

export async function waitForSupabaseShimInit(maxWaitMs: number = 10000, checkIntervalMs: number = 100): Promise<MockSupabaseClient> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (isInitialized && shimClient) {
      return shimClient;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }

  throw new Error(`Supabase shim initialization timeout after ${maxWaitMs}ms`);
}

export { loadConfig } from './supabaseClient';
