import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<void> | null = null;

export const initSupabase = async (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('🔧 Starting Supabase client initialization...');

      const config = await getConfig();

      const startTime = performance.now();

      const storageKey = 'twa-undergroundlab';

      supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey: storageKey
        }
      });

      const endTime = performance.now();
      console.log(`🔧 Singleton Supabase client created with storageKey: ${storageKey} (${(endTime - startTime).toFixed(2)}ms)`);
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      throw error;
    }
  })();

  return initPromise;
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseInstance;
};

export default getSupabase;
