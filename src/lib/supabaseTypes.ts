// Type stubs for Supabase - allows removing @supabase/supabase-js dependency

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: User;
}

export interface SupabaseClient {
  auth: any;
  from: (table: string) => any;
  rpc: (fn: string, params?: any) => Promise<any>;
  channel: (name: string) => any;
  storage: any;
}
