import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

let client: SupabaseClient | null = null;
let configPromise: Promise<{supabaseUrl: string; supabaseAnonKey: string}> | null = null;
let config: {supabaseUrl: string; supabaseAnonKey: string} | null = null;
let initPromise: Promise<SupabaseClient> | null = null;
let isInitialized = false;

// Global deduplication flag stored on window to survive React StrictMode double renders
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_INIT_IN_PROGRESS__ = (window as any).__SUPABASE_INIT_IN_PROGRESS__ || false;
}

async function loadConfig(): Promise<{supabaseUrl: string; supabaseAnonKey: string}> {
  const raw = (import.meta as any)?.env?.VITE_USE_SXT;
  const useSXT = (() => {
    if (raw === undefined || raw === null || raw === '') return true; // default to SxT
    return ['1', 'true', 'yes'].includes(String(raw).toLowerCase());
  })();
  if (useSXT) {
    console.log('Supabase disabled: running in SxT mode');
    return { supabaseUrl: '', supabaseAnonKey: '' };
  }

  if (config) {
    return config;
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      // Try build-time env vars first (for local development)
      const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL;
      const buildTimeKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (buildTimeUrl && buildTimeKey && buildTimeUrl !== 'undefined' && buildTimeKey !== 'undefined') {
        logger.info('Using build-time configuration (local dev)');
        config = {
          supabaseUrl: buildTimeUrl,
          supabaseAnonKey: buildTimeKey,
        };
        return config;
      }

      // Fallback to runtime config from Edge Function
      logger.info('Fetching runtime configuration...');

      // Use the project URL for the config endpoint
      // This should match the actual Supabase project URL from environment variables
      const configUrl = 'https://loxoontsctworiabrcbc.supabase.co/functions/v1/app-config';

      const response = await fetch(configUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
      }

      const runtimeConfig = await response.json();

      if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseAnonKey) {
        throw new Error('Invalid configuration received from server');
      }

      logger.info('Runtime configuration loaded successfully');
      config = runtimeConfig;
      return config;
    } catch (error) {
      logger.error('Failed to load configuration', error);
      throw new Error('Failed to initialize application configuration');
    }
  })();

  return configPromise;
}

export async function initSupabase(): Promise<SupabaseClient> {
  const raw = (import.meta as any)?.env?.VITE_USE_SXT;
  const useSXT = (() => {
    if (raw === undefined || raw === null || raw === '') return true; // default to SxT
    return ['1', 'true', 'yes'].includes(String(raw).toLowerCase());
  })();
  if (useSXT) {
    console.log('Supabase disabled: running in SxT mode');
    // Return inert client that won't error on access
    const dummy = new Proxy({} as SupabaseClient, {
      get() {
        return () => null;
      }
    });
    client = dummy;
    isInitialized = true;
    return dummy;
  }

  // Check global flag first (survives React StrictMode double renders)
  if (typeof window !== 'undefined' && (window as any).__SUPABASE_INITIALIZED__) {
    if (client && isInitialized) {
      return client;
    }
  }

  // If already initialized, return existing client
  if (client && isInitialized) {
    return client;
  }

  // If initialization is in progress, wait for it (critical for React StrictMode)
  if (initPromise) {
    return initPromise;
  }

  // Check window-level flag to prevent duplicate inits across renders
  if (typeof window !== 'undefined') {
    if ((window as any).__SUPABASE_INIT_IN_PROGRESS__) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 50));
      if (client && isInitialized) {
        return client;
      }
    }
    (window as any).__SUPABASE_INIT_IN_PROGRESS__ = true;
  }

  initPromise = (async () => {
    try {
      const { supabaseUrl, supabaseAnonKey } = await loadConfig();

      client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storageKey: 'twa-undergroundlab',
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        global: {
          headers: {
            'x-app': 'undergroundlab-twa',
          },
        },
      });

      // Set flags IMMEDIATELY after client creation, before any async operations
      isInitialized = true;

      if (typeof window !== 'undefined') {
        (window as any).__SUPABASE_CLIENT__ = client;
        (window as any).__SUPABASE_INITIALIZED__ = true;
        (window as any).__SUPABASE_INIT_IN_PROGRESS__ = false;
        window.dispatchEvent(new Event('supabase-ready'));
      }

      return client;
    } catch (error) {
      // Reset state on error so retry is possible
      initPromise = null;
      isInitialized = false;

      if (typeof window !== 'undefined') {
        (window as any).__SUPABASE_INIT_IN_PROGRESS__ = false;
        (window as any).__SUPABASE_INITIALIZED__ = false;
        window.dispatchEvent(new Event('supabase-reset'));
      }

      logger.error('Supabase initialization failed', error);
      throw error;
    }
  })();

  return initPromise;
}

export function getSupabase(): SupabaseClient {
  if (!client || !isInitialized) {
    throw new Error('Supabase client not initialized. Call initSupabase() first.');
  }
  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const activeClient = getSupabase();
    const value = Reflect.get(activeClient, property, receiver);

    if (typeof value === 'function') {
      return value.bind(activeClient);
    }

    return value;
  },
  set(_target, property, value, receiver) {
    const activeClient = getSupabase();
    return Reflect.set(activeClient, property, value, receiver);
  },
  has(_target, property) {
    const activeClient = getSupabase();
    return Reflect.has(activeClient, property);
  },
  ownKeys() {
    const activeClient = getSupabase();
    return Reflect.ownKeys(activeClient as object);
  },
  getOwnPropertyDescriptor(_target, property) {
    const activeClient = getSupabase();
    return Reflect.getOwnPropertyDescriptor(activeClient as object, property);
  },
});

export function isSupabaseInitialized(): boolean {
  return isInitialized && client !== null;
}

export function getSupabaseSession() {
  const supabase = getSupabase();
  return supabase.auth.getSession();
}

/**
 * Wait for Supabase to be fully initialized
 * @param maxWaitMs Maximum time to wait in milliseconds (default: 10000ms)
 * @param checkIntervalMs Interval between checks in milliseconds (default: 100ms)
 * @returns Promise that resolves to the Supabase client or rejects on timeout
 */
export async function waitForSupabaseInit(maxWaitMs: number = 10000, checkIntervalMs: number = 100): Promise<SupabaseClient> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (isInitialized && client) {
      return client;
    }

    // If initialization is in progress, wait for it
    if (initPromise) {
      try {
        return await initPromise;
      } catch (error) {
        logger.warn('Supabase initialization failed, retrying...', { error });
      }
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }

  throw new Error(`Supabase initialization timeout after ${maxWaitMs}ms`);
}

// Export config loader for other uses
export { loadConfig };
