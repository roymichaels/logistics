import { logger } from './logger';

const SESSION_KEY = 'twa-undergroundlab-session-v2';

interface SessionData {
  user: {
    id: string;
    email?: string;
    metadata?: Record<string, any>;
  };
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

class SessionManagerShim {
  private currentSession: SessionData | null = null;

  async restoreSession(supabase?: any): Promise<SessionData | null> {
    try {
      if (typeof window === 'undefined') {
        logger.info('SessionManager shim: Server-side, no session to restore');
        return null;
      }

      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        logger.info('SessionManager shim: Session restored from localStorage', {
          userId: this.currentSession?.user.id
        });
        return this.currentSession;
      }

      logger.info('SessionManager shim: No stored session found');
      return null;
    } catch (error) {
      logger.error('SessionManager shim: Failed to restore session', error);
      return null;
    }
  }

  async saveSession(sessionData: SessionData): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      this.currentSession = sessionData;
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      logger.info('SessionManager shim: Session saved to localStorage', {
        userId: sessionData.user.id
      });
    } catch (error) {
      logger.error('SessionManager shim: Failed to save session', error);
    }
  }

  async clearSession(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      this.currentSession = null;
      localStorage.removeItem(SESSION_KEY);
      logger.info('SessionManager shim: Session cleared from localStorage');
    } catch (error) {
      logger.error('SessionManager shim: Failed to clear session', error);
    }
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  getDiagnostics(): Record<string, any> {
    return {
      sessionManagerType: 'shim',
      hasSession: !!this.currentSession,
      sessionTimestamp: this.currentSession ? new Date().toISOString() : null,
      userId: this.currentSession?.user.id || null,
      localStorageAvailable: typeof window !== 'undefined' && !!window.localStorage,
      timestamp: new Date().toISOString()
    };
  }
}

export const sessionManagerShim = new SessionManagerShim();
