import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectEthereumWallet, connectSolanaWallet, connectTonWallet, clearLocalSession } from '../lib/auth/walletAuth';

type SxtRole = 'client' | 'business_owner' | 'driver' | 'manager' | 'dispatcher' | 'warehouse' | 'sales' | 'customer_service' | 'infrastructure_owner' | 'admin' | 'user';

interface SxtSession {
  walletType: 'ethereum' | 'solana' | 'ton';
  walletAddress: string;
  role: SxtRole;
  businesses?: string[];
}

interface SxtAuthContextValue {
  user: SxtSession | null;
  role: SxtRole;
  businesses: string[];
  loginWithEthereum: () => Promise<void>;
  loginWithSolana: (adapter: any) => Promise<void>;
  loginWithTon: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const SxtAuthContext = createContext<SxtAuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'sxt_session';
const DEV_ROLE_OVERRIDE_KEY = 'dev-console:role-override';

function loadStoredSession(): SxtSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistSession(session: SxtSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function SxtAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SxtSession | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<string | null>(() =>
    localStorage.getItem(DEV_ROLE_OVERRIDE_KEY)
  );

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored) {
      setSession(stored);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleRoleChange = () => {
      const override = localStorage.getItem(DEV_ROLE_OVERRIDE_KEY);
      setRoleOverride(override);
    };

    window.addEventListener('dev-role-changed', handleRoleChange);
    window.addEventListener('storage', handleRoleChange);

    return () => {
      window.removeEventListener('dev-role-changed', handleRoleChange);
      window.removeEventListener('storage', handleRoleChange);
    };
  }, []);

  const loginWithEthereum = async () => {
    setError(null);
    const { address } = await connectEthereumWallet();
    const defaultRole = (roleOverride as SxtRole) || 'client';
    const s: SxtSession = { walletType: 'ethereum', walletAddress: address, role: defaultRole, businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const loginWithSolana = async (adapter: any) => {
    setError(null);
    const { address } = await connectSolanaWallet(adapter);
    const defaultRole = (roleOverride as SxtRole) || 'client';
    const s: SxtSession = { walletType: 'solana', walletAddress: address, role: defaultRole, businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const loginWithTon = async () => {
    setError(null);
    const { address } = await connectTonWallet();
    const defaultRole = (roleOverride as SxtRole) || 'client';
    const s: SxtSession = { walletType: 'ton', walletAddress: address, role: defaultRole, businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const logout = () => {
    setSession(null);
    clearLocalSession();
  };

  const value = useMemo<SxtAuthContextValue>(() => {
    const effectiveRole = (roleOverride as SxtRole) || session?.role || 'client';
    return {
      user: session ? { ...session, role: effectiveRole } : null,
      role: effectiveRole,
      businesses: session?.businesses || [],
      loginWithEthereum,
      loginWithSolana,
      loginWithTon,
      logout,
      isAuthenticated: !!session,
      isLoading,
      error,
    };
  }, [session, isLoading, error, roleOverride]);

  return (
    <SxtAuthContext.Provider value={value}>
      {children}
    </SxtAuthContext.Provider>
  );
}

export function useSxtAuth() {
  const ctx = useContext(SxtAuthContext);
  if (!ctx) throw new Error('useSxtAuth must be used within SxtAuthProvider');
  return ctx;
}
