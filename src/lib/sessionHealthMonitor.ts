/**
 * Session Health Monitor
 *
 * Monitors session health and handles automatic token refresh,
 * session validation, and recovery from network failures.
 */

import { SupabaseClient } from './supabaseTypes';
import { logger } from './logger';
import { sessionManager } from './sessionManager';

const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_REFRESH_RETRY_DELAY = 30 * 1000; // 30 seconds
const MAX_REFRESH_RETRIES = 3;
const VISIBILITY_CHECK_DELAY = 1000; // 1 second after tab becomes visible

export interface SessionHealthStatus {
  healthy: boolean;
  lastCheck: number;
  lastRefresh: number;
  checkCount: number;
  failureCount: number;
  lastError?: string;
}

export class SessionHealthMonitor {
  private static instance: SessionHealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private visibilityListener: (() => void) | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private isMonitoring = false;
  private refreshRetryCount = 0;
  private refreshRetryTimeout: NodeJS.Timeout | null = null;

  private status: SessionHealthStatus = {
    healthy: true,
    lastCheck: 0,
    lastRefresh: 0,
    checkCount: 0,
    failureCount: 0,
  };

  private constructor() {}

  static getInstance(): SessionHealthMonitor {
    if (!SessionHealthMonitor.instance) {
      SessionHealthMonitor.instance = new SessionHealthMonitor();
    }
    return SessionHealthMonitor.instance;
  }

  /**
   * Start monitoring session health
   */
  start(supabase: SupabaseClient): void {
    if (this.isMonitoring) {
      logger.debug('Session health monitor already running');
      return;
    }

    this.supabaseClient = supabase;
    this.isMonitoring = true;

    logger.info('Starting session health monitor');

    // Initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, HEALTH_CHECK_INTERVAL);

    // Monitor page visibility changes
    this.setupVisibilityListener();

    // Monitor network status
    this.setupNetworkListener();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping session health monitor');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.refreshRetryTimeout) {
      clearTimeout(this.refreshRetryTimeout);
      this.refreshRetryTimeout = null;
    }

    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }

    this.isMonitoring = false;
    this.supabaseClient = null;
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.supabaseClient) {
      logger.warn('Cannot perform health check: no Supabase client');
      return;
    }

    try {
      this.status.checkCount++;
      this.status.lastCheck = Date.now();

      logger.debug('Performing session health check', {
        checkNumber: this.status.checkCount,
      });

      // Check if session exists in Supabase
      const { data, error } = await this.supabaseClient.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        logger.warn('No active session found during health check');
        this.status.healthy = false;
        this.status.failureCount++;

        // Try to restore from backup
        await this.attemptSessionRecovery();
        return;
      }

      // Check if session is close to expiration
      const expiresAt = data.session.expires_at ? data.session.expires_at * 1000 : 0;
      const timeUntilExpiry = expiresAt - Date.now();
      const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);

      if (timeUntilExpiry < 10 * 60 * 1000) { // Less than 10 minutes
        logger.info('Session expires soon, refreshing', { minutesUntilExpiry });
        await this.refreshSession();
      } else {
        logger.debug('Session health check passed', { minutesUntilExpiry });
        this.status.healthy = true;
        this.refreshRetryCount = 0;
      }

      // Update session backup
      sessionManager.saveSession(data.session);

    } catch (error) {
      logger.error('Session health check failed', error);
      this.status.healthy = false;
      this.status.failureCount++;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';

      // Try to recover from failure
      await this.handleHealthCheckFailure(error);
    }
  }

  /**
   * Refresh session tokens
   */
  private async refreshSession(): Promise<boolean> {
    if (!this.supabaseClient) {
      logger.warn('Cannot refresh session: no Supabase client');
      return false;
    }

    try {
      logger.info('Refreshing session tokens');

      const { data, error } = await this.supabaseClient.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No session returned from refresh');
      }

      logger.info('Session refreshed successfully');
      this.status.lastRefresh = Date.now();
      this.status.healthy = true;
      this.refreshRetryCount = 0;

      // Save refreshed session
      sessionManager.saveSession(data.session);

      return true;
    } catch (error) {
      logger.error('Session refresh failed', error);
      this.status.healthy = false;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';

      // Schedule retry
      await this.scheduleRefreshRetry();

      return false;
    }
  }

  /**
   * Schedule refresh retry with exponential backoff
   */
  private async scheduleRefreshRetry(): Promise<void> {
    if (this.refreshRetryCount >= MAX_REFRESH_RETRIES) {
      logger.error('Max refresh retries reached, attempting session recovery');
      await this.attemptSessionRecovery();
      return;
    }

    this.refreshRetryCount++;
    const delay = TOKEN_REFRESH_RETRY_DELAY * Math.pow(2, this.refreshRetryCount - 1);

    logger.info('Scheduling refresh retry', {
      attempt: this.refreshRetryCount,
      delaySeconds: Math.round(delay / 1000),
    });

    this.refreshRetryTimeout = setTimeout(() => {
      this.refreshSession();
    }, delay);
  }

  /**
   * Attempt to recover session from backup
   */
  private async attemptSessionRecovery(): Promise<void> {
    if (!this.supabaseClient) {
      return;
    }

    try {
      logger.info('Attempting session recovery from backup');

      const restoredSession = await sessionManager.restoreSession(this.supabaseClient);

      if (restoredSession) {
        logger.info('Session recovered successfully');
        this.status.healthy = true;
        this.refreshRetryCount = 0;
      } else {
        logger.warn('Session recovery failed, user needs to re-authenticate');
        this.status.healthy = false;
      }
    } catch (error) {
      logger.error('Session recovery error', error);
      this.status.healthy = false;
    }
  }

  /**
   * Handle health check failure
   */
  private async handleHealthCheckFailure(error: any): Promise<void> {
    // Check if it's a network error
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      logger.warn('Network error during health check, will retry');
      return;
    }

    // Check if it's an auth error
    if (error.message?.includes('session') || error.message?.includes('token')) {
      logger.warn('Authentication error during health check, attempting recovery');
      await this.attemptSessionRecovery();
      return;
    }

    logger.error('Unhandled health check failure', error);
  }

  /**
   * Setup visibility change listener
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.visibilityListener = () => {
      if (!document.hidden) {
        logger.debug('Tab became visible, performing health check');

        // Wait a bit before checking to ensure network is ready
        setTimeout(() => {
          this.performHealthCheck();
        }, VISIBILITY_CHECK_DELAY);
      }
    };

    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      logger.info('Network connection restored, performing health check');
      setTimeout(() => {
        this.performHealthCheck();
      }, VISIBILITY_CHECK_DELAY);
    };

    const handleOffline = () => {
      logger.warn('Network connection lost');
      this.status.healthy = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Get current health status
   */
  getStatus(): SessionHealthStatus {
    return { ...this.status };
  }

  /**
   * Force health check
   */
  async forceCheck(): Promise<void> {
    logger.info('Forcing session health check');
    await this.performHealthCheck();
  }

  /**
   * Reset status
   */
  resetStatus(): void {
    this.status = {
      healthy: true,
      lastCheck: 0,
      lastRefresh: 0,
      checkCount: 0,
      failureCount: 0,
    };
    this.refreshRetryCount = 0;
  }
}

export const sessionHealthMonitor = SessionHealthMonitor.getInstance();

// Export to window for debugging
if (typeof window !== 'undefined') {
  (window as any).sessionHealthMonitor = sessionHealthMonitor;
  (window as any).getSessionHealth = () => sessionHealthMonitor.getStatus();
}
