import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

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

  console.log('🔧 Singleton Supabase client created with storageKey: twa-undergroundlab');

  if (typeof window !== 'undefined') {
    (window as any).__SUPABASE_CLIENT__ = client;
  }

  return client;
}

export function getSupabaseSession() {
  const supabase = getSupabase();
  return supabase.auth.getSession();
}
