export const sessionManager = {
  async restoreSession(supabase?: any): Promise<any> {
    console.log('[STUB] sessionManager.restoreSession - frontend-only mode');
    return null;
  },

  getDiagnostics(): any {
    return { mode: 'frontend-only', backend: 'disabled' };
  },

  clearSession(): void {
    localStorage.removeItem('wallet_session');
  },

  saveSession(session: any): void {
    if (session) {
      localStorage.setItem('wallet_session', JSON.stringify(session));
    }
  }
};
