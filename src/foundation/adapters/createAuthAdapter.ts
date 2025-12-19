import { IAuthProvider } from '../abstractions/IAuthProvider';
import { SupabaseAuthAdapter } from './SupabaseAuthAdapter';
import { SupabaseAuthShim } from './SupabaseAuthShim';
import { logger } from '../../lib/logger';
import { isSupabaseShimEnabled } from '../../lib/supabaseShimConfig';

export function createAuthAdapter(client?: any): IAuthProvider {
  const useShim = isSupabaseShimEnabled();

  if (useShim) {
    logger.info('Creating auth adapter: SupabaseAuthShim (no-op with localStorage persistence)');
    return new SupabaseAuthShim();
  }

  if (!client) {
    throw new Error('Client required for SupabaseAuthAdapter');
  }

  logger.info('Creating auth adapter: SupabaseAuthAdapter (real Supabase)');
  return new SupabaseAuthAdapter(client);
}
