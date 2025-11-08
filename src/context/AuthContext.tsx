import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthState, AuthUser } from '../lib/authService';
import {
  recordAuthAttempt,
  isInAuthLoop,
  isCircuitBreakerActive,
  activateCircuitBreaker,
  resetAuthLoopDetection,
  getAuthLoopDiagnostics
} from '../lib/authLoopDetection';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authenticate: () => Promise<void>;
  authenticateWithEthereum: (address: string, signature: string, message: string) => Promise<void>;
  authenticateWithSolana: (address: string, signature: string, message: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    authService.initialize().catch(error => {
      logger.error('❌ Auth initialization error:', error);
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

  const value: AuthContextValue = {
    ...authState,
    signOut,
    refreshSession,
    authenticate,
    authenticateWithEthereum,
    authenticateWithSolana,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
