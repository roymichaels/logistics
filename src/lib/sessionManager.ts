import { supabase } from './supabase';
import { logger } from './logger';

interface SessionState {
  isValid: boolean;
  expiresAt: number | null;
  userId: string | null;
  lastRefresh: number | null;
}

class SessionManager {
  private state: SessionState = {
    isValid: false,
    expiresAt: null,
    userId: null,
    lastRefresh: null,
  };

  private refreshTimer: number | null = null;
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly MIN_REFRESH_INTERVAL_MS = 60 * 1000; // 1 minute minimum between refreshes

  async initialize(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('[SessionManager] Error getting session', error);
        this.clearSession();
        return;
      }

      if (session) {
        this.updateSessionState(session);
        this.scheduleRefresh();
        logger.info('[SessionManager] Session initialized', {
          userId: session.user.id,
          expiresAt: new Date(session.expires_at || 0).toISOString(),
        });
      } else {
        this.clearSession();
      }

      this.setupAuthListener();
      this.setupStorageListener();
    } catch (error) {
      logger.error('[SessionManager] Initialization error', error);
      this.clearSession();
    }
  }

  private updateSessionState(session: any): void {
    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;

    this.state = {
      isValid: true,
      expiresAt,
      userId: session.user?.id || null,
      lastRefresh: Date.now(),
    };
  }

  private clearSession(): void {
    this.state = {
      isValid: false,
      expiresAt: null,
      userId: null,
      lastRefresh: null,
    };

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange((event, session) => {
      logger.info('[SessionManager] Auth state changed', { event });

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          this.updateSessionState(session);
          this.scheduleRefresh();
        }
      } else if (event === 'SIGNED_OUT') {
        this.clearSession();
      } else if (event === 'USER_UPDATED') {
        if (session) {
          this.updateSessionState(session);
        }
      }
    });
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('sb-') && event.key.includes('-auth-token')) {
        logger.info('[SessionManager] Auth token changed in another tab');
        void this.initialize();
      }
    });
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.state.expiresAt) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = this.state.expiresAt - now;
    const timeUntilRefresh = timeUntilExpiry - this.REFRESH_BUFFER_MS;

    if (timeUntilRefresh <= 0) {
      void this.refreshSession();
      return;
    }

    this.refreshTimer = window.setTimeout(() => {
      void this.refreshSession();
    }, timeUntilRefresh);

    logger.info('[SessionManager] Refresh scheduled', {
      refreshIn: Math.round(timeUntilRefresh / 1000) + 's',
      expiresIn: Math.round(timeUntilExpiry / 1000) + 's',
    });
  }

  async refreshSession(): Promise<boolean> {
    const now = Date.now();

    if (
      this.state.lastRefresh &&
      now - this.state.lastRefresh < this.MIN_REFRESH_INTERVAL_MS
    ) {
      logger.warn('[SessionManager] Skipping refresh - too soon since last refresh');
      return true;
    }

    try {
      logger.info('[SessionManager] Refreshing session');

      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error('[SessionManager] Session refresh failed', error);
        this.clearSession();
        return false;
      }

      if (session) {
        this.updateSessionState(session);
        this.scheduleRefresh();
        logger.info('[SessionManager] Session refreshed successfully');
        return true;
      } else {
        logger.warn('[SessionManager] No session returned from refresh');
        this.clearSession();
        return false;
      }
    } catch (error) {
      logger.error('[SessionManager] Exception during session refresh', error);
      this.clearSession();
      return false;
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.state.isValid) {
      return false;
    }

    if (!this.state.expiresAt) {
      return false;
    }

    const now = Date.now();

    if (now >= this.state.expiresAt) {
      logger.warn('[SessionManager] Session expired');
      const refreshed = await this.refreshSession();
      return refreshed;
    }

    const timeUntilExpiry = this.state.expiresAt - now;

    if (timeUntilExpiry < this.REFRESH_BUFFER_MS) {
      logger.info('[SessionManager] Session expiring soon, refreshing proactively');
      const refreshed = await this.refreshSession();
      return refreshed;
    }

    return true;
  }

  getState(): SessionState {
    return { ...this.state };
  }

  isSessionValid(): boolean {
    if (!this.state.isValid || !this.state.expiresAt) {
      return false;
    }

    return Date.now() < this.state.expiresAt;
  }

  getUserId(): string | null {
    return this.state.userId;
  }

  getTimeUntilExpiry(): number | null {
    if (!this.state.expiresAt) {
      return null;
    }

    return Math.max(0, this.state.expiresAt - Date.now());
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.clearSession();
  }
}

export const sessionManager = new SessionManager();
