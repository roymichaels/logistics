/**
 * Enhanced Session Manager
 *
 * Provides robust session persistence and recovery mechanisms to prevent
 * logout issues on app refresh. This module handles:
 * - Session backup and restoration
 * - Token refresh scheduling
 * - Cross-tab synchronization
 * - Session validation
 * - Error recovery
 */

import { SupabaseClient, Session } from '@supabase/supabase-js';
import { logger } from './logger';

const SESSION_STORAGE_KEY = 'twa-undergroundlab-session-v2';
const SESSION_METADATA_KEY = 'twa-session-metadata';
const SESSION_VERSION = 2;
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes before expiry

interface StoredSession {
  version: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  timestamp: number;
  checksum?: string;
}

interface SessionMetadata {
  lastActivity: number;
  deviceId: string;
  restoreCount: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private sessionValidated = false;

  private constructor() {
    // Initialize cross-tab sync listener
    this.initCrossTabSync();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Save session to localStorage with validation
   */
  saveSession(session: Session): boolean {
    try {
      if (!session?.access_token || !session?.refresh_token) {
        logger.warn('Cannot save session: missing tokens');
        return false;
      }

      const expiresAt = session.expires_at
        ? session.expires_at * 1000
        : Date.now() + 24 * 60 * 60 * 1000;

      const storedSession: StoredSession = {
        version: SESSION_VERSION,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt,
        userId: session.user?.id || '',
        timestamp: Date.now(),
        checksum: this.calculateChecksum(session.access_token),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));
      this.updateMetadata();

      logger.debug('Session saved successfully', {
        userId: storedSession.userId,
        expiresIn: Math.round((expiresAt - Date.now()) / 1000 / 60) + ' minutes',
      });

      // Schedule token refresh
      this.scheduleTokenRefresh(session);

      return true;
    } catch (error) {
      logger.error('Failed to save session', error);
      return false;
    }
  }

  /**
   * Restore session from localStorage with validation
   */
  async restoreSession(supabase: SupabaseClient): Promise<Session | null> {
    try {
      const stored = this.getStoredSession();
      if (!stored) {
        logger.debug('No stored session found');
        return null;
      }

      // Validate stored session
      if (!this.validateStoredSession(stored)) {
        logger.warn('Stored session is invalid, clearing');
        this.clearSession();
        return null;
      }

      // Check if session is expired
      if (this.isSessionExpired(stored)) {
        logger.info('Stored session expired, attempting refresh');
        return await this.refreshWithStoredToken(supabase, stored);
      }

      // Validate checksum
      if (stored.checksum && stored.checksum !== this.calculateChecksum(stored.accessToken)) {
        logger.warn('Session checksum mismatch, possible tampering');
        this.clearSession();
        return null;
      }

      // Restore session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
      });

      if (error || !data.session) {
        logger.error('Failed to restore session from storage', error);
        // Try refresh as fallback
        return await this.refreshWithStoredToken(supabase, stored);
      }

      logger.info('Session restored successfully from storage', {
        userId: stored.userId,
        ageMinutes: Math.round((Date.now() - stored.timestamp) / 1000 / 60),
      });

      this.sessionValidated = true;
      this.updateMetadata();
      this.scheduleTokenRefresh(data.session);

      return data.session;
    } catch (error) {
      logger.error('Error restoring session', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Try to refresh session using stored refresh token
   */
  private async refreshWithStoredToken(
    supabase: SupabaseClient,
    stored: StoredSession
  ): Promise<Session | null> {
    try {
      logger.info('Attempting to refresh expired session');

      const { data, error } = await supabase.auth.setSession({
        access_token: stored.accessToken,
        refresh_token: stored.refreshToken,
      });

      if (error || !data.session) {
        logger.error('Failed to refresh session', error);
        this.clearSession();
        return null;
      }

      // Immediately refresh the session to get new tokens
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session) {
        logger.error('Failed to refresh session after restore', refreshError);
        this.clearSession();
        return null;
      }

      logger.info('Session refreshed successfully');
      this.saveSession(refreshData.session);
      this.sessionValidated = true;

      return refreshData.session;
    } catch (error) {
      logger.error('Error refreshing stored session', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  scheduleTokenRefresh(session: Session): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    if (!session?.expires_at) {
      logger.warn('Cannot schedule token refresh: no expiration time');
      return;
    }

    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshAt = timeUntilExpiry - TOKEN_REFRESH_MARGIN_MS;

    if (refreshAt <= 0) {
      logger.warn('Token expires soon or has expired, refresh needed immediately');
      return;
    }

    logger.debug('Token refresh scheduled', {
      minutesUntilRefresh: Math.round(refreshAt / 60000),
      expiresAt: new Date(expiresAt).toISOString(),
    });

    this.tokenRefreshTimeout = setTimeout(() => {
      this.performScheduledRefresh();
    }, refreshAt);
  }

  /**
   * Perform scheduled token refresh
   */
  private async performScheduledRefresh(): Promise<void> {
    if (this.isRefreshing) {
      logger.debug('Refresh already in progress, skipping');
      return;
    }

    logger.info('Performing scheduled token refresh');
    // The actual refresh will be handled by Supabase's auto-refresh
    // This is just a placeholder for custom refresh logic if needed
  }

  /**
   * Clear all session data
   */
  clearSession(): void {
    try {
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
        this.tokenRefreshTimeout = null;
      }

      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_METADATA_KEY);
      this.sessionValidated = false;

      logger.info('Session cleared');
    } catch (error) {
      logger.error('Error clearing session', error);
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    const stored = this.getStoredSession();
    if (!stored) return false;

    return this.validateStoredSession(stored) && !this.isSessionExpired(stored);
  }

  /**
   * Get stored session data
   */
  private getStoredSession(): StoredSession | null {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!data) return null;

      const parsed = JSON.parse(data) as StoredSession;

      // Check version compatibility
      if (parsed.version !== SESSION_VERSION) {
        logger.warn('Session version mismatch, clearing old session');
        this.clearSession();
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error('Error reading stored session', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Validate stored session structure
   */
  private validateStoredSession(stored: StoredSession): boolean {
    if (!stored.accessToken || !stored.refreshToken) {
      logger.warn('Stored session missing tokens');
      return false;
    }

    if (!stored.userId) {
      logger.warn('Stored session missing user ID');
      return false;
    }

    // Check if session is too old
    const age = Date.now() - stored.timestamp;
    if (age > MAX_SESSION_AGE_MS) {
      logger.warn('Stored session too old', { ageHours: Math.round(age / 1000 / 60 / 60) });
      return false;
    }

    return true;
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(stored: StoredSession): boolean {
    return Date.now() >= stored.expiresAt;
  }

  /**
   * Calculate simple checksum for session validation
   */
  private calculateChecksum(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Update session metadata
   */
  private updateMetadata(): void {
    try {
      const metadata = this.getMetadata();
      metadata.lastActivity = Date.now();
      metadata.restoreCount++;

      localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      logger.error('Error updating session metadata', error);
    }
  }

  /**
   * Get session metadata
   */
  private getMetadata(): SessionMetadata {
    try {
      const data = localStorage.getItem(SESSION_METADATA_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Error reading session metadata', error);
    }

    return {
      lastActivity: Date.now(),
      deviceId: this.getDeviceId(),
      restoreCount: 0,
    };
  }

  /**
   * Get or create device ID
   */
  private getDeviceId(): string {
    const key = 'twa-device-id';
    let deviceId = localStorage.getItem(key);

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, deviceId);
    }

    return deviceId;
  }

  /**
   * Initialize cross-tab synchronization
   */
  private initCrossTabSync(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key === SESSION_STORAGE_KEY) {
        if (event.newValue === null) {
          logger.debug('Session cleared in another tab');
        } else {
          logger.debug('Session updated in another tab');
        }
      }
    });
  }

  /**
   * Get session diagnostics
   */
  getDiagnostics(): Record<string, any> {
    const stored = this.getStoredSession();
    const metadata = this.getMetadata();

    return {
      hasStoredSession: !!stored,
      sessionValidated: this.sessionValidated,
      isValid: this.isSessionValid(),
      stored: stored ? {
        userId: stored.userId,
        expiresAt: new Date(stored.expiresAt).toISOString(),
        age: Math.round((Date.now() - stored.timestamp) / 1000 / 60) + ' minutes',
        isExpired: this.isSessionExpired(stored),
      } : null,
      metadata: {
        lastActivity: new Date(metadata.lastActivity).toISOString(),
        restoreCount: metadata.restoreCount,
        deviceId: metadata.deviceId,
      },
      refreshScheduled: !!this.tokenRefreshTimeout,
      isRefreshing: this.isRefreshing,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }
}

export const sessionManager = SessionManager.getInstance();

// Export diagnostics to window for debugging
if (typeof window !== 'undefined') {
  (window as any).sessionManager = sessionManager;
  (window as any).getSessionDiagnostics = () => sessionManager.getDiagnostics();
}
