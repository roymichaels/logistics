import { logger } from './logger';

export interface SupabaseShimConfig {
  enabled: boolean;
  useIndexedDB: boolean;
  persistAuthState: boolean;
}

export function detectSupabaseShimMode(): SupabaseShimConfig {
  const shimEnv = import.meta.env.VITE_USE_SUPABASE_SHIM;
  const enabled = shimEnv === 'true' || shimEnv === '1' || shimEnv === 'yes';

  logger.info('Supabase shim mode detection', {
    env: shimEnv,
    enabled
  });

  return {
    enabled,
    useIndexedDB: true,
    persistAuthState: true
  };
}

export function isSupabaseShimEnabled(): boolean {
  return detectSupabaseShimMode().enabled;
}
