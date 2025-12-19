import { IAuthProvider } from '../abstractions/IAuthProvider';
import { logger } from '../../lib/logger';

class FrontendOnlyAuthProvider implements IAuthProvider {
  async signUp() { return { user: null, error: new Error('Frontend-only mode') }; }
  async signIn() { return { user: null, error: new Error('Frontend-only mode') }; }
  async signOut() { return { error: null }; }
  async getSession() { return { data: null, error: null }; }
  onAuthStateChange() { return { data: { subscription: { unsubscribe: () => {} } }, error: null }; }
}

export function createAuthAdapter(client?: any): IAuthProvider {
  logger.info('Creating auth adapter: FrontendOnlyAuthProvider (no Supabase)');
  return new FrontendOnlyAuthProvider();
}
