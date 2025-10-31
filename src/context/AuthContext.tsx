import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthState, AuthUser } from '../lib/authService';

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
      console.error('❌ Auth initialization error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authService.signOut();
  };

  const refreshSession = async () => {
    await authService.refreshSession();
  };

  const authenticate = async () => {
    await authService.authenticateWithTelegram();
  };

  const authenticateWithEthereum = async (address: string, signature: string, message: string) => {
    await authService.authenticateWithEthereum(address, signature, message);
  };

  const authenticateWithSolana = async (address: string, signature: string, message: string) => {
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
