import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<void> | null = null;

export const initSupabase = async (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log('🔧 Starting Supabase client initialization...');

      let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('🔄 Fetching runtime configuration...');

        try {
          const configResponse = await fetch('/runtime-config.json');
          if (configResponse.ok) {
            const config = await configResponse.json();
            supabaseUrl = config.supabaseUrl;
            supabaseAnonKey = config.supabaseAnonKey;
            console.log('✅ Runtime configuration loaded successfully');
          } else {
            console.error('⚠️ Runtime config endpoint returned:', configResponse.status);
          }
        } catch (fetchError) {
          console.error('⚠️ Failed to fetch runtime config:', fetchError);
        }
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const startTime = performance.now();

      const storageKey = 'twa-undergroundlab';

      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
