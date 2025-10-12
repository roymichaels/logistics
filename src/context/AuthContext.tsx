import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthState, AuthUser } from '../lib/authService';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authenticate: () => Promise<void>;
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

  const value: AuthContextValue = {
    ...authState,
    signOut,
    refreshSession,
    authenticate,
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
  const { isAuthenticated, isLoading, error } = useAuth();

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
        direction: 'rtl',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏳</div>
        <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>מאמת זהות...</h1>
        <p style={{ fontSize: '14px', color: '#666' }}>אנא המתן</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        direction: 'rtl',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>שגיאת אימות</h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px', maxWidth: '400px', whiteSpace: 'pre-line' }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007aff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        direction: 'rtl',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>נדרש אימות</h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
          יש לפתוח את האפליקציה מתוך טלגרם
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
