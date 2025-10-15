import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './tenantGuard.ts';

interface ClientOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

export function getServiceSupabaseClient(options: ClientOptions = {}): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new HttpError(500, 'Supabase environment variables are not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: options.persistSession ?? false,
      autoRefreshToken: options.autoRefreshToken ?? false,
    },
  });
}
