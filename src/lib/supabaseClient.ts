import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
        console.log('✅ Using build-time configuration (local dev)');
        config = {
          supabaseUrl: buildTimeUrl,
          supabaseAnonKey: buildTimeKey,
        };
        return config;
      }

      // Fallback to runtime config from Edge Function
      console.log('🔄 Fetching runtime configuration...');

      // Use a hardcoded project URL for the config endpoint
      // This is the only hardcoded value, and it's safe because it's just the project identifier
      const configUrl = 'https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/app-config';

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

      console.log('✅ Runtime configuration loaded successfully');
      config = runtimeConfig;
      return config;
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      throw new Error('Failed to initialize application configuration');
    }
  })();

  return configPromise;
}

export async function initSupabase(): Promise<SupabaseClient> {
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
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
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

      console.error('❌ Supabase initialization failed:', error);
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
        console.warn('Supabase initialization failed, retrying...', error);
      }
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }

  throw new Error(`Supabase initialization timeout after ${maxWaitMs}ms`);
}

// Export config loader for other uses
export { loadConfig };
