import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthState, AuthUser } from '../lib/authService';
import {
  recordAuthAttempt,
  isInAuthLoop,
  isCircuitBreakerActive,
  activateCircuitBreaker,
  resetAuthLoopDetection,
  getAuthLoopDiagnostics
} from '../lib/authLoopDetection';
import { logger } from '../lib/logger';
import { SxtAuthProvider, useSxtAuth } from './SxtAuthProvider';
import {
  createLocalSession,
  getLocalSession,
  clearLocalSession,
  connectEthereumWallet,
  connectSolanaWallet,
  connectTonWallet,
} from '../lib/auth/walletAuth';
import { runtimeEnvironment } from '../lib/runtimeEnvironment';
import { getUserDisplayName } from '../utils/userIdentifier';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authenticate: () => Promise<void>;
  authenticateWithEthereum: (address: string, signature: string, message: string) => Promise<void>;
  authenticateWithSolana: (address: string, signature: string, message: string) => Promise<void>;
  authenticateWithTon: (address: string, signature: string, message: string) => Promise<void>;
  walletType: string | null;
  walletAddress: string | null;
  walletSession: any | null;
  kycStatus: 'unverified' | 'pending' | 'verified';
  loginWithEthereum: () => Promise<void>;
  loginWithSolana: (adapter: any) => Promise<void>;
  loginWithTon: () => Promise<void>;
  logoutWallet: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use centralized runtime environment to check SXT mode
  // IMPORTANT: Frontend-only mode is the default authentication method
  const useSXT = runtimeEnvironment.isSxtModeEnabled();

  if (useSXT) {
    return <SxtShimProvider>{children}</SxtShimProvider>;
  }

  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [walletType, setWalletType] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletSession, setWalletSession] = useState<any | null>(null);
  const [kycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    authService.initialize().catch(error => {
      logger.error('[AUTH] Initialization error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Check for auth loop before logging out
    if (isInAuthLoop()) {
      logger.error('⚠️ Auth loop detected! Activating circuit breaker.');
      activateCircuitBreaker();
      return;
    }

    // Record logout attempt
    recordAuthAttempt('logout', authState.user?.id);

    await authService.signOut();
  };

  const refreshSession = async () => {
    await authService.refreshSession();
  };

  const authenticate = async () => {
    // Check if circuit breaker is active
    if (isCircuitBreakerActive()) {
      const diagnostics = getAuthLoopDiagnostics();
      const cooldownMinutes = Math.ceil(diagnostics.cooldownRemaining / 60000);
      logger.error(`🚫 Circuit breaker active. Please wait ${cooldownMinutes} minutes before trying again.`);
      throw new Error(`Too many authentication attempts. Please wait ${cooldownMinutes} minutes and try again.`);
    }

    // Check for auth loop before authenticating
    if (isInAuthLoop()) {
      logger.error('⚠️ Auth loop detected! Activating circuit breaker.');
      activateCircuitBreaker();
      throw new Error('Authentication loop detected. Please wait 5 minutes and try again.');
    }

    // Record login attempt
    recordAuthAttempt('login');

    await authService.authenticateWithTelegram();
  };

  const authenticateWithEthereum = async (address: string, signature: string, message: string) => {
    // Check if circuit breaker is active
    if (isCircuitBreakerActive()) {
      const diagnostics = getAuthLoopDiagnostics();
      const cooldownMinutes = Math.ceil(diagnostics.cooldownRemaining / 60000);
      throw new Error(`Too many authentication attempts. Please wait ${cooldownMinutes} minutes and try again.`);
    }

    // Check for auth loop
    if (isInAuthLoop()) {
      activateCircuitBreaker();
      throw new Error('Authentication loop detected. Please wait 5 minutes and try again.');
    }

    // Record login attempt
    recordAuthAttempt('login', address);

    await authService.authenticateWithEthereum(address, signature, message);
  };

  const authenticateWithSolana = async (address: string, signature: string, message: string) => {
    // Check if circuit breaker is active
    if (isCircuitBreakerActive()) {
      const diagnostics = getAuthLoopDiagnostics();
      const cooldownMinutes = Math.ceil(diagnostics.cooldownRemaining / 60000);
      throw new Error(`Too many authentication attempts. Please wait ${cooldownMinutes} minutes and try again.`);
    }

    // Check for auth loop
    if (isInAuthLoop()) {
      activateCircuitBreaker();
      throw new Error('Authentication loop detected. Please wait 5 minutes and try again.');
    }

    // Record login attempt
    recordAuthAttempt('login', address);

    await authService.authenticateWithSolana(address, signature, message);
  };

  const authenticateWithTon = async (address: string, signature: string, message: string) => {
    // Check if circuit breaker is active
    if (isCircuitBreakerActive()) {
      const diagnostics = getAuthLoopDiagnostics();
      const cooldownMinutes = Math.ceil(diagnostics.cooldownRemaining / 60000);
      throw new Error(`Too many authentication attempts. Please wait ${cooldownMinutes} minutes and try again.`);
    }

    // Check for auth loop
    if (isInAuthLoop()) {
      activateCircuitBreaker();
      throw new Error('Authentication loop detected. Please wait 5 minutes and try again.');
    }

    // Record login attempt
    recordAuthAttempt('login', address);

    await authService.authenticateWithTon(address, signature, message);
  };

  const walletAuthEnabled = (import.meta as any)?.env?.VITE_ENABLE_WALLET_AUTH;

  const loginWithEthereum = async () => {
    if (!walletAuthEnabled) return;
    try {
      const { address, session } = await connectEthereumWallet();
      setWalletType('ethereum');
      setWalletAddress(address);
      setWalletSession(session);
    } catch (error) {
      logger.error('Ethereum wallet login failed', error);
    }
  };

  const loginWithSolana = async (adapter: any) => {
    if (!walletAuthEnabled) return;
    try {
      const { address, session } = await connectSolanaWallet(adapter);
      setWalletType('solana');
      setWalletAddress(address);
      setWalletSession(session);
    } catch (error) {
      logger.error('Solana wallet login failed', error);
    }
  };

  const loginWithTon = async () => {
    if (!walletAuthEnabled) return;
    try {
      const { address, session } = await connectTonWallet();
      setWalletType('ton');
      setWalletAddress(address);
      setWalletSession(session);
    } catch (error) {
      logger.error('TON wallet login failed', error);
    }
  };

  const logoutWallet = () => {
    setWalletType(null);
    setWalletAddress(null);
    setWalletSession(null);
    clearLocalSession();
  };

  const value: AuthContextValue = {
    ...authState,
    signOut,
    refreshSession,
    authenticate,
    authenticateWithEthereum,
    authenticateWithSolana,
    authenticateWithTon,
    walletType,
    walletAddress,
    walletSession,
    kycStatus,
    loginWithEthereum,
    loginWithSolana,
    loginWithTon,
    logoutWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Shim provider when running in SxT mode (blockchain-based authentication)
function SxtShimProvider({ children }: { children: React.ReactNode }) {
  const { user: sxtUser, role, isAuthenticated: sxtIsAuthenticated, isLoading: sxtIsLoading } = useSxtAuth();
  // Use centralized runtime environment to check SXT mode
  const useSXT = runtimeEnvironment.isSxtModeEnabled();

  const [user, setUser] = useState<{ walletType: string; walletAddress: string } | null>(() => {
    if (sxtUser) {
      return { walletType: sxtUser.walletType, walletAddress: sxtUser.walletAddress };
    }
    const stored = getLocalSession();
    return stored && stored.walletAddress ? { walletType: stored.walletType, walletAddress: stored.walletAddress } : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (sxtUser) return true;
    const stored = getLocalSession();
    return !!(stored && stored.walletAddress);
  });
  const [isLoading, setIsLoading] = useState<boolean>(useSXT);
  const [error, setError] = useState<string | null>(null);
  const [kycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');

  // Rehydrate session on mount in SxT mode
  useEffect(() => {
    if (!useSXT) return;

    // Prefer the session managed by SxtAuthProvider; fall back to walletAuth local session
    if (sxtUser) {
      setUser({ walletType: sxtUser.walletType, walletAddress: sxtUser.walletAddress });
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const stored = getLocalSession();
    if (stored && stored.walletAddress) {
      setUser({ walletType: stored.walletType, walletAddress: stored.walletAddress });
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [useSXT, sxtUser]);

  const loginWithEthereum = async () => {
    try {
      setIsLoading(true);
      const session = await connectEthereumWallet();
      const stored = createLocalSession({
        walletType: 'ethereum',
        walletAddress: session.address,
        issuedAt: Date.now(),
      });
      setUser({ walletType: stored.walletType, walletAddress: stored.walletAddress });
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithSolana = async (adapter: any) => {
    try {
      setIsLoading(true);
      const session = await connectSolanaWallet(adapter);
      const stored = createLocalSession({
        walletType: 'solana',
        walletAddress: session.address,
        issuedAt: Date.now(),
      });
      setUser({ walletType: stored.walletType, walletAddress: stored.walletAddress });
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTon = async () => {
    try {
      setIsLoading(true);
      const session = await connectTonWallet();
      const stored = createLocalSession({
        walletType: 'ton',
        walletAddress: session.address,
        issuedAt: Date.now(),
      });
      setUser({ walletType: stored.walletType, walletAddress: stored.walletAddress });
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearLocalSession();
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const ctx = useMemo<AuthContextValue>(() => {
    const displayName = user ? getUserDisplayName({
      id: user.walletAddress,
      wallet_address: user.walletAddress,
      role: role || 'customer',
    } as any) : null;

    return {
      user: user ? {
        id: user.walletAddress,
        username: displayName,
        name: displayName,
        photo_url: null,
        role,
        auth_method: user.walletType,
        kycStatus,
      } as any : null,
      session: user,
      isAuthenticated,
      isLoading,
      error,
      signOut: async () => logout(),
      refreshSession: async () => {},
      authenticate: async () => {},
      authenticateWithEthereum: async () => { await loginWithEthereum(); },
      authenticateWithSolana: async () => { await loginWithSolana(null); },
      authenticateWithTon: async () => { await loginWithTon(); },
      walletType: user?.walletType || null,
      walletAddress: user?.walletAddress || null,
      walletSession: user || null,
      kycStatus,
      loginWithEthereum,
      loginWithSolana,
      loginWithTon,
      logoutWallet: logout,
    };
  }, [user, role, isAuthenticated, isLoading, error, kycStatus]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .auth-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e0e0e0;
            border-top-color: #007aff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 24px;
          }
        `}</style>
        <div className="auth-spinner" />
        <h1 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>Loading...</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
