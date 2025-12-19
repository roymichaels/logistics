export class SupabaseAuthAdapter {
  constructor(client?: any) {
    console.log('[STUB] SupabaseAuthAdapter - frontend-only mode');
  }

  async signUp() { return { user: null, error: new Error('Frontend-only mode') }; }
  async signIn() { return { user: null, error: new Error('Frontend-only mode') }; }
  async signOut() { return { error: null }; }
  async getSession() { return { data: null, error: null }; }
  onAuthStateChange() { return { data: { subscription: { unsubscribe: () => {} } }, error: null }; }
}
