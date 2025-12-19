import { getSupabase, isSupabaseInitialized } from './supabaseClient';

import { logger } from './logger';
import { sessionManager } from './sessionManager';
import { sessionHealthMonitor } from './sessionHealthMonitor';
import { createLocalSession } from './auth/walletAuth';
import { localSessionManager } from './localSessionManager';
import { roleAssignmentManager } from './roleAssignment';

export interface AuthUser {
  id: string;
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
    if (raw === undefined || raw === null || raw === '') return false;
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

      // Null safety: check if session.user exists
      if (!session.user) {
        logger.warn('Session exists but user object is missing');
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid session: missing user data',
        });
        return;
      }

      const walletEth = session.user.user_metadata?.wallet_address_eth ||
                        session.user.app_metadata?.wallet_address_eth;
      const walletSol = session.user.user_metadata?.wallet_address_sol ||
                        session.user.app_metadata?.wallet_address_sol;

      // Check if at least one identifier exists
      if (!walletEth && !walletSol) {
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
        .select('id, wallet_address_eth, wallet_address_sol, username, name, photo_url, role, auth_method');

      if (walletEth) {
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
      logger.info('[AUTH] Starting frontend-only auth initialization');

      const localSession = localSessionManager.getSession();

      if (localSession && localSessionManager.isValid()) {
        logger.info('[AUTH] Valid local session found, restoring');

        const role = localSession.role;
        this.updateState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: localSession.wallet,
            username: localSession.wallet,
            name: localSession.wallet,
            photo_url: null,
            role,
            auth_method: localSession.walletType
          } as any,
          session: localSession,
          error: null,
        });
        return;
      }

      logger.info('[AUTH] No session found, user needs to authenticate');
      this.updateState({
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      logger.error('[AUTH] Initialization error', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
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
    logger.warn('[AUTH] Telegram authentication not available in frontend-only mode');

    this.updateState({
      isLoading: false,
      error: 'Telegram authentication is not available in this build',
    });

    throw new Error('Telegram authentication not available in frontend-only mode');
  }

  public async signOut(): Promise<void> {
    try {
      logger.info('[AUTH] Sign out initiated');

      sessionHealthMonitor.stop();

      if (this.sessionHealthCheckInterval) {
        clearInterval(this.sessionHealthCheckInterval);
        this.sessionHealthCheckInterval = null;
      }

      localSessionManager.clearSession();
      this.clearStoredData();
      this.handleSignOut();

      logger.info('[AUTH] Sign out complete');
    } catch (error) {
      logger.error('[AUTH] Sign out error', error);
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
      logger.debug('[AUTH] Token refresh already in progress, skipping');
      return;
    }

    this.isRefreshingToken = true;

    try {
      logger.info('[AUTH] Refreshing local session');

      const session = localSessionManager.getSession();
      if (!session) {
        throw new Error('No active session to refresh');
      }

      localSessionManager.refreshExpiryTime();
      logger.info('[AUTH] Session expiry refreshed');
    } catch (error) {
      logger.error('[AUTH] Session refresh error', error);
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
    this.updateState({ isLoading: true, error: null });

    try {
      logger.info('[AUTH] Ethereum wallet authentication initiated');

      const role = roleAssignmentManager.getRoleForWallet(walletAddress) || 'customer';
      const session = localSessionManager.createSession(walletAddress, 'ethereum', signature, message, role);

      logger.info(`[AUTH] Wallet session created for ${walletAddress} with role: ${role}`);

      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: walletAddress,
          wallet_address_eth: walletAddress,
          username: walletAddress,
          name: walletAddress,
          photo_url: null,
          role,
          auth_method: 'ethereum'
        } as any,
        session: {
          wallet: walletAddress,
          walletType: 'ethereum',
          role
        },
        error: null
      });

      if (this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            wallet: walletAddress,
            walletType: 'ethereum',
            role
          }
        });
      }

      logger.info('[AUTH] Ethereum authentication successful');
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
    this.updateState({ isLoading: true, error: null });

    try {
      logger.info('[AUTH] Solana wallet authentication initiated');

      const role = roleAssignmentManager.getRoleForWallet(walletAddress) || 'customer';
      const session = localSessionManager.createSession(walletAddress, 'solana', signature, message, role);

      logger.info(`[AUTH] Wallet session created for ${walletAddress} with role: ${role}`);

      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: walletAddress,
          wallet_address_sol: walletAddress,
          username: walletAddress,
          name: walletAddress,
          photo_url: null,
          role,
          auth_method: 'solana'
        } as any,
        session: {
          wallet: walletAddress,
          walletType: 'solana',
          role
        },
        error: null
      });

      if (this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            wallet: walletAddress,
            walletType: 'solana',
            role
          }
        });
      }

      logger.info('[AUTH] Solana authentication successful');
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
