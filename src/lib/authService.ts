import { getSupabase, isSupabaseInitialized } from './supabaseClient';
import { telegram } from './telegram';
import { logger } from './logger';
import { sessionManager } from './sessionManager';
import { sessionHealthMonitor } from './sessionHealthMonitor';
import { createLocalSession } from './auth/walletAuth';

export interface AuthUser {
  id: string;
  telegram_id?: string;
  wallet_address_eth?: string;
  wallet_address_sol?: string;
  username: string | null;
  name: string;
  photo_url: string | null;
  role: string;
  auth_method?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthStateListener = (state: AuthState) => void;

const SESSION_STORAGE_KEY = 'twa-undergroundlab-session-backup';
const USER_CONTEXT_KEY = 'twa-user-context';
const SESSION_SYNC_CHANNEL = 'twa-session-sync';
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface StoredUserContext {
  businessId: string | null;
  infrastructureId: string | null;
  role: string | null;
  lastUpdate: number;
}

class AuthService {
  private listeners: Set<AuthStateListener> = new Set();
  private currentState: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };
  private authListenerInitialized = false;
  private authUnsubscribe: (() => void) | null = null;
  private sessionHealthCheckInterval: NodeJS.Timeout | null = null;
  private sessionSyncChannel: BroadcastChannel | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;
  private isRefreshingToken = false;

  constructor() {
    // Don't initialize auth listener in constructor - wait for Supabase to be ready
    // Initialize cross-tab session synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.sessionSyncChannel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
      this.sessionSyncChannel.onmessage = (event) => {
        if (event.data.type === 'SESSION_UPDATED') {
          logger.debug('Session update from another tab');
          this.handleCrossTabSessionUpdate(event.data.session);
        } else if (event.data.type === 'SIGNED_OUT') {
          logger.debug('Sign out from another tab');
          this.handleSignOut();
        }
      };
    }
  }

  private isSxtMode() {
    const raw = (import.meta as any)?.env?.VITE_USE_SXT;
    if (raw === undefined || raw === null || raw === '') return true;
    return ['1', 'true', 'yes'].includes(String(raw).toLowerCase());
  }

  private initializeAuthListener() {
    if (this.isSxtMode()) {
      logger.info('Auth listener skipped in SxT mode');
      this.updateState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        session: null,
      });
      return;
    }
    // Only initialize once
    if (this.authListenerInitialized) {
      return;
    }

    // Check if Supabase is ready
    if (!isSupabaseInitialized()) {
      logger.warn('Cannot initialize auth listener - Supabase not ready');
      return;
    }

    const supabase = getSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {

      // Handle all events that provide a valid session
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
          this.handleSessionUpdate(session);
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load - normal for first-time users
          this.updateState({
            isLoading: false,
            isAuthenticated: false
          });
        }
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      }
    });

    this.authUnsubscribe = authListener.subscription.unsubscribe;
    this.authListenerInitialized = true;
  }

  private async handleCrossTabSessionUpdate(session: any) {
    if (!session || this.currentState.isAuthenticated) {
      return;
    }
    logger.debug('Processing cross-tab session update');
    await this.handleSessionUpdate(session, false);
  }

  private async handleSessionUpdate(session: any, broadcastToOtherTabs = true) {
    try {
      if (!session?.user) {
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Save session using the enhanced session manager
      sessionManager.saveSession(session);

      const supabase = getSupabase();
      const telegramId = session.user.user_metadata?.telegram_id ||
                         session.user.app_metadata?.telegram_id;
      const walletEth = session.user.user_metadata?.wallet_address_eth ||
                        session.user.app_metadata?.wallet_address_eth;
      const walletSol = session.user.user_metadata?.wallet_address_sol ||
                        session.user.app_metadata?.wallet_address_sol;

      // Check if at least one identifier exists
      if (!telegramId && !walletEth && !walletSol) {
        logger.warn('Session exists but no valid identifier found');
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid session: missing user identifier',
        });
        return;
      }

      // Query user by any available identifier
      let query = supabase
        .from('users')
        .select('id, telegram_id, wallet_address_eth, wallet_address_sol, username, name, photo_url, role, auth_method');

      if (telegramId) {
        query = query.eq('telegram_id', telegramId);
      } else if (walletEth) {
        query = query.eq('wallet_address_eth', walletEth.toLowerCase());
      } else if (walletSol) {
        query = query.eq('wallet_address_sol', walletSol.toLowerCase());
      }

      const { data: userData, error } = await query.maybeSingle();

      if (error || !userData) {
        logger.error('Failed to fetch user data', error);
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to load user profile',
        });
        return;
      }

      const authUser = userData as AuthUser;

      // Save user context for recovery
      const businessId = session.user.app_metadata?.business_id || null;
      const infrastructureId = session.user.app_metadata?.infrastructure_id || null;
      this.saveUserContext(businessId, infrastructureId, authUser.role);

      this.updateState({
        user: authUser,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      if (broadcastToOtherTabs && this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at
          }
        });
      }

      logger.info('Session update complete');
    } catch (error) {
      logger.error('Error handling session update', error);
      this.updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private scheduleTokenRefresh(session: any) {
    // Token refresh is now handled by sessionManager
    // This method is kept for backward compatibility
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }

  private handleSignOut() {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }

    // Stop health monitoring
    sessionHealthMonitor.stop();

    // Clear session using session manager
    sessionManager.clearSession();

    if (this.sessionSyncChannel) {
      this.sessionSyncChannel.postMessage({ type: 'SIGNED_OUT' });
    }

    this.updateState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  private updateState(newState: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  public subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AuthState {
    return this.currentState;
  }

  public async initialize(): Promise<void> {
    if (this.isSxtMode()) {
      logger.info('SxT mode: auth initialization skipped');
      this.updateState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        session: null
      });
      return;
    }

    try {
      logger.info('Starting authentication initialization');
      this.initializeAuthListener();

      if (!isSupabaseInitialized()) {
        throw new Error('Supabase client not initialized. Cannot proceed with authentication.');
      }

      const supabase = getSupabase();

      // First, try to restore session using the enhanced session manager
      logger.debug('Attempting session restoration');
      const restoredSession = await sessionManager.restoreSession(supabase);

      if (restoredSession) {
        logger.info('Session restored from storage');
        await this.handleSessionUpdate(restoredSession, false);
        // Start health monitoring instead of legacy health check
        sessionHealthMonitor.start(supabase);
        return;
      }

      // If no restored session, check for active Supabase session
      logger.debug('Checking for active Supabase session');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error('Session recovery error', sessionError);
        this.updateState({
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
        return;
      }

      if (sessionData.session) {
        logger.info('Active Supabase session found');
        await this.handleSessionUpdate(sessionData.session);
        // Start health monitoring instead of legacy health check
        sessionHealthMonitor.start(supabase);
        return;
      }

      logger.info('No session found, user needs to authenticate');
      this.updateState({
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      logger.error('Authentication initialization failed', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  private async tryRestoreSessionFromBackup(): Promise<boolean> {
    // Session restoration is now handled by sessionManager in initialize()
    // This method is kept for backward compatibility
    logger.debug('Legacy session restore method called, delegating to sessionManager');
    return false;
  }

  private startSessionHealthCheck() {
    // Legacy method - now handled by sessionHealthMonitor
    // Keep for backward compatibility
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
      this.sessionHealthCheckInterval = null;
    }

    if (isSupabaseInitialized()) {
      const supabase = getSupabase();
      sessionHealthMonitor.start(supabase);
    }
  }

  private backupSession(session: any) {
    // Session backup is now handled by sessionManager
    // This method is kept for backward compatibility
    if (session) {
      sessionManager.saveSession(session);
    }
  }

  public saveUserContext(businessId: string | null, infrastructureId: string | null, role: string | null) {
    try {
      const context: StoredUserContext = {
        businessId,
        infrastructureId,
        role,
        lastUpdate: Date.now(),
      };
      localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context));
    } catch (error) {
      logger.error('Failed to save user context', error);
    }
  }

  public getUserContext(): StoredUserContext | null {
    try {
      const data = localStorage.getItem(USER_CONTEXT_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get user context', error);
      return null;
    }
  }

  public async authenticateWithTelegram(): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      if (!telegram.isAvailable || !telegram.initData) {
        throw new Error('Telegram environment not available or no initData');
      }

      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webapp',
          initData: telegram.initData,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        logger.error('Authentication failed', new Error(errorData.error || 'Unknown error'), {
          status: response.status,
          statusText: response.statusText,
          timestamp: errorData.timestamp
        });

        let userFriendlyError = errorData.error || `Authentication failed: ${response.status}`;

        if (response.status === 401) {
          if (!errorData.error || errorData.error.includes('signature')) {
            userFriendlyError = 'אימות Telegram נכשל. אנא ודא שהאפליקציה נפתחה מתוך Telegram.\n\nTelegram authentication failed. Please ensure the app is opened from within Telegram.';
          }
        } else if (response.status === 500) {
          // More specific error message for 500 errors
          const errorDetail = errorData.error || 'Internal server error';
          if (errorDetail.includes('Invalid login credentials')) {
            userFriendlyError = 'שגיאת אימות זמנית. מנסה שוב...\n\nTemporary authentication error. Retrying...';
          } else if (errorDetail.includes('TELEGRAM_BOT_TOKEN')) {
            userFriendlyError = 'תצורת הבוט לא תקינה. אנא צור קשר עם התמיכה.\n\nBot configuration error. Please contact support.';
          } else {
            userFriendlyError = `שגיאת שרת: ${errorDetail}\n\nServer error: ${errorDetail}`;
          }
        } else if (response.status === 400) {
          if (!errorData.error || errorData.error.includes('Invalid')) {
            userFriendlyError = 'נתוני אימות לא חוקיים.\n\nInvalid authentication data.';
          }
        }

        throw new Error(userFriendlyError);
      }

      const result = await response.json();

      if (!result.session?.access_token) {
        throw new Error('No access token in response');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw new Error(`Failed to set session: ${sessionError.message}`);
      }
    } catch (error) {
      logger.error('Telegram authentication error', error);

      let errorMessage = 'Authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'פסק זמן לאימות. אנא בדוק את חיבור האינטרנט ונסה שוב.\n\nAuthentication timeout. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    try {
      // Stop session health monitoring
      sessionHealthMonitor.stop();

      // Stop legacy session health check
      if (this.sessionHealthCheckInterval) {
        clearInterval(this.sessionHealthCheckInterval);
        this.sessionHealthCheckInterval = null;
      }

      if (!isSupabaseInitialized()) {
        logger.warn('Supabase not initialized, clearing local state only');
        this.handleSignOut();
        this.clearStoredData();
        return;
      }

      const supabase = getSupabase();
      await supabase.auth.signOut();

      this.clearStoredData();
      this.handleSignOut();
    } catch (error) {
      logger.error('Sign out error', error);
      throw error;
    }
  }

  private clearStoredData() {
    try {
      sessionManager.clearSession();
      localStorage.removeItem(USER_CONTEXT_KEY);
      // Don't clear all localStorage - preserve user preferences
    } catch (error) {
      logger.error('Error clearing stored data', error);
    }
  }

  public async refreshSession(): Promise<void> {
    if (this.isRefreshingToken) {
      logger.debug('Token refresh already in progress, skipping');
      return;
    }

    this.isRefreshingToken = true;

    try {
      logger.info('Refreshing session');
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase not initialized. Cannot refresh session.');
      }

      const supabase = getSupabase();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error('Session refresh failed', error);
        // Try one more time to restore from backup using session manager
        const restoredSession = await sessionManager.restoreSession(supabase);
        if (!restoredSession) {
          throw error;
        }
        await this.handleSessionUpdate(restoredSession);
        return;
      }

      if (data.session) {
        logger.info('Session refreshed successfully');
        await this.handleSessionUpdate(data.session);
      }
    } catch (error) {
      logger.error('Session refresh error', error);
      throw error;
    } finally {
      this.isRefreshingToken = false;
    }
  }

  public async authenticateWithEthereum(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<void> {
    if (this.isSxtMode()) {
      createLocalSession({ walletType: 'ethereum', walletAddress, issuedAt: Date.now() });
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: walletAddress,
          username: walletAddress,
          name: walletAddress,
          photo_url: null,
          role: 'user',
          auth_method: 'ethereum'
        } as any,
        session: { wallet: walletAddress },
        error: null
      });
      return;
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/web3-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'apikey': config.supabaseAnonKey,
        },
        body: JSON.stringify({
          chain: 'ethereum',
          walletAddress,
          signature,
          message,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.session?.access_token) {
        throw new Error('No access token in response');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw new Error(`Failed to set session: ${sessionError.message}`);
      }
    } catch (error) {
      logger.error('Ethereum authentication error', error);

      let errorMessage = 'Ethereum authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Authentication timeout. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async authenticateWithSolana(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<void> {
    if (this.isSxtMode()) {
      createLocalSession({ walletType: 'solana', walletAddress, issuedAt: Date.now() });
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: walletAddress,
          username: walletAddress,
          name: walletAddress,
          photo_url: null,
          role: 'user',
          auth_method: 'solana'
        } as any,
        session: { wallet: walletAddress },
        error: null
      });
      return;
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/web3-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'apikey': config.supabaseAnonKey,
        },
        body: JSON.stringify({
          chain: 'solana',
          walletAddress,
          signature,
          message,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.session?.access_token) {
        throw new Error('No access token in response');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw new Error(`Failed to set session: ${sessionError.message}`);
      }
    } catch (error) {
      logger.error('Solana authentication error', error);

      let errorMessage = 'Solana authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Authentication timeout. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public cleanup(): void {
    // Stop health monitoring
    sessionHealthMonitor.stop();

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
      this.authListenerInitialized = false;
    }
    if (this.sessionHealthCheckInterval) {
      clearInterval(this.sessionHealthCheckInterval);
      this.sessionHealthCheckInterval = null;
    }
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
    if (this.sessionSyncChannel) {
      this.sessionSyncChannel.close();
      this.sessionSyncChannel = null;
    }
    // Cleanup session manager
    sessionManager.cleanup();
    this.listeners.clear();
  }
}

export const authService = new AuthService();
