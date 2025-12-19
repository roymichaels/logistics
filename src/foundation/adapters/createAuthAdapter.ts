import { IAuthProvider } from '../abstractions/IAuthProvider';
import { SupabaseAuthAdapter } from './SupabaseAuthAdapter';
import { logger } from '../../lib/logger';

export function createAuthAdapter(client?: any): IAuthProvider {
  if (!client) {
    throw new Error('Client required for SupabaseAuthAdapter');
  }

  logger.info('Creating auth adapter: SupabaseAuthAdapter');
  return new SupabaseAuthAdapter(client);
}
