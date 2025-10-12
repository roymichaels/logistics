import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let configPromise: Promise<{supabaseUrl: string; supabaseAnonKey: string}> | null = null;
let config: {supabaseUrl: string; supabaseAnonKey: string} | null = null;
let initPromise: Promise<SupabaseClient> | null = null;
let isInitialized = false;

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
  // If already initialized, return existing client
  if (client && isInitialized) {
    console.log('✅ Supabase client already initialized, returning existing instance');
    return client;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    console.log('⏳ Supabase initialization in progress, waiting...');
    return initPromise;
  }

  // Start new initialization
  console.log('🔧 Starting Supabase client initialization...');
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

      isInitialized = true;
      console.log('🔧 Singleton Supabase client created with storageKey: twa-undergroundlab');

      if (typeof window !== 'undefined') {
        (window as any).__SUPABASE_CLIENT__ = client;
        (window as any).__SUPABASE_INITIALIZED__ = true;
      }

      return client;
    } catch (error) {
      // Reset state on error so retry is possible
      initPromise = null;
      isInitialized = false;
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

// Export config loader for other uses
export { loadConfig };
