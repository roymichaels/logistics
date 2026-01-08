import { logger } from './logger';
import { localSessionManager } from './localSessionManager';
import { roleAssignmentManager } from './roleAssignment';
import { getUserDisplayName } from '../utils/userIdentifier';
import { supabase } from './supabase';
import { walletUuidManager } from './walletUuidManager';

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

const USER_CONTEXT_KEY = 'twa-user-context';
const SESSION_SYNC_CHANNEL = 'twa-session-sync';

interface StoredUserContext {
  businessId: string | null;
  infrastructureId: string | null;
  role: string | null;
  lastUpdate: number;
}

/**
 * Helper function to format wallet address for display
 * Returns shortened format: 0xd040...2dfc5
 */
function formatWalletForDisplay(walletAddress: string): string {
  if (!walletAddress || walletAddress.length < 10) {
    return walletAddress;
  }
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
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
  private sessionSyncChannel: BroadcastChannel | null = null;

  constructor() {
    logger.info('Frontend-only mode active – no backend required');

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

  private async handleCrossTabSessionUpdate(session: any) {
    if (!session || this.currentState.isAuthenticated) {
      return;
    }
    logger.debug('Processing cross-tab session update');

    const role = session.role || 'customer';
    const displayName = formatWalletForDisplay(session.wallet);
    this.updateState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: session.wallet,
        username: displayName,
        name: displayName,
        photo_url: null,
        role,
        auth_method: session.walletType
      } as any,
      session,
      error: null,
    });
  }

  private handleSignOut() {
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
    try {
      logger.info('[AUTH] Starting frontend-only auth initialization');

      const localSession = localSessionManager.getSession();

      if (localSession && localSessionManager.isValid()) {
        logger.info('[AUTH] Valid local session found, restoring');

        const role = localSession.role;
        const displayName = formatWalletForDisplay(localSession.wallet);
        const userId = localSession.authUserId || localSession.wallet;

        this.updateState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: userId,
            username: displayName,
            name: displayName,
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

  public async signOut(): Promise<void> {
    try {
      logger.info('[AUTH] Sign out initiated');
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
      localStorage.removeItem(USER_CONTEXT_KEY);
    } catch (error) {
      logger.error('Error clearing stored data', error);
    }
  }

  public async refreshSession(): Promise<void> {
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
    }
  }

  private async getOrCreateAuthUserForWallet(
    walletAddress: string,
    walletType: 'ethereum' | 'solana' | 'ton',
    role: string
  ): Promise<string> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();

      if (existingProfile) {
        logger.info(`[AUTH] Found existing profile for wallet: ${walletAddress}`);
        return existingProfile.id;
      }

      const userId = walletUuidManager.getOrCreateUuid(walletAddress, walletType);
      logger.info(`[AUTH] Using client-generated UUID for wallet: ${walletAddress} -> ${userId}`);

      const walletTypeDb = walletType === 'ethereum' ? 'eth' : walletType === 'solana' ? 'sol' : 'ton';
      const displayName = formatWalletForDisplay(walletAddress);

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          wallet_address: normalizedAddress,
          wallet_type: walletTypeDb,
          role: role,
          name: displayName,
        });

      if (profileError) {
        if (profileError.code === '23505') {
          logger.warn('[AUTH] Profile already exists, continuing with existing UUID');
          return userId;
        }
        logger.error('[AUTH] Failed to create profile:', profileError);
        throw new Error('Failed to create user profile');
      }

      logger.info(`[AUTH] Profile created successfully for ${walletAddress}`);
      return userId;
    } catch (error) {
      logger.error('[AUTH] Error in getOrCreateAuthUserForWallet:', error);
      throw error;
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

      const authUserId = await this.getOrCreateAuthUserForWallet(walletAddress, 'ethereum', role);

      const session = localSessionManager.createSession(walletAddress, 'ethereum', signature, message, role, authUserId);

      logger.info(`[AUTH] Wallet session created for ${walletAddress} with auth ID: ${authUserId}`);

      const displayName = formatWalletForDisplay(walletAddress);
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: authUserId,
          wallet_address_eth: walletAddress,
          username: displayName,
          name: displayName,
          photo_url: null,
          role,
          auth_method: 'ethereum'
        } as any,
        session: {
          wallet: walletAddress,
          walletType: 'ethereum',
          role,
          authUserId
        },
        error: null
      });

      if (this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            wallet: walletAddress,
            walletType: 'ethereum',
            role,
            authUserId
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

      const authUserId = await this.getOrCreateAuthUserForWallet(walletAddress, 'solana', role);

      const session = localSessionManager.createSession(walletAddress, 'solana', signature, message, role, authUserId);

      logger.info(`[AUTH] Wallet session created for ${walletAddress} with auth ID: ${authUserId}`);

      const displayName = formatWalletForDisplay(walletAddress);
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: authUserId,
          wallet_address_sol: walletAddress,
          username: displayName,
          name: displayName,
          photo_url: null,
          role,
          auth_method: 'solana'
        } as any,
        session: {
          wallet: walletAddress,
          walletType: 'solana',
          role,
          authUserId
        },
        error: null
      });

      if (this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            wallet: walletAddress,
            walletType: 'solana',
            role,
            authUserId
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

  public async authenticateWithTon(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      logger.info('[AUTH] TON wallet authentication initiated');

      const role = roleAssignmentManager.getRoleForWallet(walletAddress) || 'customer';

      const authUserId = await this.getOrCreateAuthUserForWallet(walletAddress, 'ton', role);

      const session = localSessionManager.createSession(walletAddress, 'ton', signature, message, role, authUserId);

      logger.info(`[AUTH] Wallet session created for ${walletAddress} with auth ID: ${authUserId}`);

      const displayName = formatWalletForDisplay(walletAddress);
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: authUserId,
          wallet_address_ton: walletAddress,
          username: displayName,
          name: displayName,
          photo_url: null,
          role,
          auth_method: 'ton'
        } as any,
        session: {
          wallet: walletAddress,
          walletType: 'ton',
          role,
          authUserId
        },
        error: null
      });

      if (this.sessionSyncChannel) {
        this.sessionSyncChannel.postMessage({
          type: 'SESSION_UPDATED',
          session: {
            wallet: walletAddress,
            walletType: 'ton',
            role,
            authUserId
          }
        });
      }

      logger.info('[AUTH] TON authentication successful');
    } catch (error) {
      logger.error('TON authentication error', error);

      let errorMessage = 'TON authentication failed';

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
    if (this.sessionSyncChannel) {
      this.sessionSyncChannel.close();
      this.sessionSyncChannel = null;
    }
    this.listeners.clear();
  }
}

export const authService = new AuthService();
