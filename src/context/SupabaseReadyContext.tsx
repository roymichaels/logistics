import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { isSupabaseInitialized } from '../lib/supabaseClient';

export interface SupabaseReadyContextValue {
  isSupabaseReady: boolean;
  setSupabaseReady: React.Dispatch<React.SetStateAction<boolean>>;
  markSupabaseReady: () => void;
  markSupabaseNotReady: () => void;
}

const SupabaseReadyContext = createContext<SupabaseReadyContextValue | undefined>(undefined);

interface SupabaseReadyProviderProps {
  children: React.ReactNode;
  value?: SupabaseReadyContextValue;
}

export function SupabaseReadyProvider({ children, value }: SupabaseReadyProviderProps) {
  const [isReady, setIsReady] = useState(() => isSupabaseInitialized());

  useEffect(() => {
    if (value) {
      return;
    }

    setIsReady(isSupabaseInitialized());

    if (typeof window === 'undefined') {
      return;
    }

    const handleReady = () => setIsReady(true);
    const handleReset = () => setIsReady(isSupabaseInitialized());

    window.addEventListener('supabase-ready', handleReady);
    window.addEventListener('supabase-reset', handleReset);

    return () => {
      window.removeEventListener('supabase-ready', handleReady);
      window.removeEventListener('supabase-reset', handleReset);
    };
  }, [value]);

  const markSupabaseReady = useCallback(() => setIsReady(true), []);
  const markSupabaseNotReady = useCallback(() => setIsReady(false), []);

  const contextValue = useMemo(() => ({
    isSupabaseReady: isReady,
    setSupabaseReady: setIsReady,
    markSupabaseReady,
    markSupabaseNotReady
  }), [isReady, markSupabaseReady, markSupabaseNotReady]);

  return (
    <SupabaseReadyContext.Provider value={value ?? contextValue}>
      {children}
    </SupabaseReadyContext.Provider>
  );
}

export function useSupabaseReady(): SupabaseReadyContextValue {
  const context = useContext(SupabaseReadyContext);
  if (!context) {
    throw new Error('useSupabaseReady must be used within a SupabaseReadyProvider');
  }
  return context;
}
