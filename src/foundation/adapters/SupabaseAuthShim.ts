import { IAuthProvider, User, Session, AuthCredentials } from '../abstractions/IAuthProvider';
import { AsyncResult, Ok, Err } from '../types/Result';
import { logger } from '../../lib/logger';

const SESSION_KEY = 'twa-auth-session';

interface MockSession {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export class SupabaseAuthShim implements IAuthProvider {
  private mockSession: MockSession | null = null;
  private listeners: ((session: Session | null) => void)[] = [];

  constructor() {
    this.loadPersistedSession();
  }

  private loadPersistedSession() {
    try {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.mockSession = JSON.parse(stored);
        logger.info('Auth shim: loaded persisted session');
      }
    } catch (e) {
      logger.warn('Auth shim: failed to load persisted session', e);
    }
  }

  private persistSession(session: MockSession | null) {
    try {
      if (typeof window === 'undefined') return;
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      logger.warn('Auth shim: failed to persist session', e);
    }
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach(callback => {
      try {
        callback(session);
      } catch (e) {
        logger.error('Auth shim: error in listener', e);
      }
    });
  }

  async getCurrentUser(): AsyncResult<User | null, Error> {
    try {
      if (!this.mockSession) {
        return Ok(null);
      }

      return Ok(this.mapUser(this.mockSession.user));
    } catch (error) {
      logger.error('[Auth Shim] Get current user error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getCurrentSession(): AsyncResult<Session | null, Error> {
    try {
      if (!this.mockSession) {
        return Ok(null);
      }

      return Ok(this.mapSession(this.mockSession));
    } catch (error) {
      logger.error('[Auth Shim] Get current session error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async login(credentials: AuthCredentials): AsyncResult<Session, Error> {
    try {
      const mockUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: credentials.email,
        user_metadata: {
          wallet_address: credentials.walletAddress,
          telegram_id: credentials.telegramId
        },
        app_metadata: { role: 'user' }
      };

      const mockSession: MockSession = {
        user: mockUser,
        access_token: `token_${Date.now()}`,
        refresh_token: `refresh_${Date.now()}`,
        expires_at: Date.now() + 3600000
      };

      this.mockSession = mockSession;
      this.persistSession(mockSession);
      this.notifyListeners(this.mapSession(mockSession));

      logger.info('[Auth Shim] User logged in', { userId: mockUser.id });
      return Ok(this.mapSession(mockSession));
    } catch (error) {
      logger.error('[Auth Shim] Login error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async logout(): AsyncResult<void, Error> {
    try {
      this.mockSession = null;
      this.persistSession(null);
      this.notifyListeners(null);
      logger.info('[Auth Shim] User logged out');
      return Ok(undefined);
    } catch (error) {
      logger.error('[Auth Shim] Logout error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async refreshSession(): AsyncResult<Session, Error> {
    try {
      if (!this.mockSession) {
        return Err(new Error('No session to refresh'));
      }

      const refreshedSession: MockSession = {
        ...this.mockSession,
        access_token: `token_${Date.now()}`,
        expires_at: Date.now() + 3600000
      };

      this.mockSession = refreshedSession;
      this.persistSession(refreshedSession);
      logger.info('[Auth Shim] Session refreshed');
      return Ok(this.mapSession(refreshedSession));
    } catch (error) {
      logger.error('[Auth Shim] Refresh session error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.listeners.push(callback);

    if (this.mockSession) {
      callback(this.mapSession(this.mockSession));
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async switchRole(roleId: string): AsyncResult<void, Error> {
    try {
      if (this.mockSession) {
        this.mockSession.user.app_metadata = {
          ...this.mockSession.user.app_metadata,
          role: roleId
        };
        this.persistSession(this.mockSession);
        this.notifyListeners(this.mapSession(this.mockSession));
      }
      logger.info('[Auth Shim] Role switched', { role: roleId });
      return Ok(undefined);
    } catch (error) {
      logger.error('[Auth Shim] Switch role error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async impersonate(userId: string): AsyncResult<Session, Error> {
    try {
      const mockUser = {
        id: userId,
        user_metadata: {},
        app_metadata: { role: 'user' }
      };

      const mockSession: MockSession = {
        user: mockUser,
        access_token: `token_${Date.now()}`,
        refresh_token: `refresh_${Date.now()}`,
        expires_at: Date.now() + 3600000
      };

      this.mockSession = mockSession;
      this.persistSession(mockSession);
      this.notifyListeners(this.mapSession(mockSession));

      logger.info('[Auth Shim] Impersonating user', { userId });
      return Ok(this.mapSession(mockSession));
    } catch (error) {
      logger.error('[Auth Shim] Impersonate error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private mapUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      telegramId: user.user_metadata?.telegram_id,
      walletAddress: user.user_metadata?.wallet_address,
      role: user.app_metadata?.role,
      metadata: {
        ...user.user_metadata,
        ...user.app_metadata,
      },
    };
  }

  private mapSession(session: MockSession): Session {
    return {
      user: this.mapUser(session.user),
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    };
  }
}
