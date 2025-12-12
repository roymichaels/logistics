import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectEthereumWallet, connectSolanaWallet, connectTonWallet, clearLocalSession } from '../lib/auth/walletAuth';

type SxtRole = 'client' | 'business' | 'driver' | 'admin';

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

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored) {
      setSession(stored);
    }
    setLoading(false);
  }, []);

  const loginWithEthereum = async () => {
    setError(null);
    const { address } = await connectEthereumWallet();
    const s: SxtSession = { walletType: 'ethereum', walletAddress: address, role: 'client', businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const loginWithSolana = async (adapter: any) => {
    setError(null);
    const { address } = await connectSolanaWallet(adapter);
    const s: SxtSession = { walletType: 'solana', walletAddress: address, role: 'client', businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const loginWithTon = async () => {
    setError(null);
    const { address } = await connectTonWallet();
    const s: SxtSession = { walletType: 'ton', walletAddress: address, role: 'client', businesses: [] };
    setSession(s);
    persistSession(s);
  };

  const logout = () => {
    setSession(null);
    clearLocalSession();
  };

  const value = useMemo<SxtAuthContextValue>(() => ({
    user: session,
    role: session?.role || 'client',
    businesses: session?.businesses || [],
    loginWithEthereum,
    loginWithSolana,
    loginWithTon,
    logout,
    isAuthenticated: !!session,
    isLoading,
    error,
  }), [session, isLoading, error]);

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
