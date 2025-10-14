import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { getSupabase, initSupabase, isSupabaseInitialized } from '../lib/supabaseClient';

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

    let isMounted = true;

    const updateReadyState = () => {
      if (!isMounted) {
        return;
      }
      setIsReady(isSupabaseInitialized());
    };

    updateReadyState();

    if (typeof window === 'undefined') {
      return () => {
        isMounted = false;
      };
    }

    const ensureClient = async () => {
      try {
        await initSupabase();
        if (!isMounted) {
          return;
        }
        getSupabase();
        setIsReady(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to initialize Supabase client in SupabaseReadyProvider:', error);
        setIsReady(false);
      }
    };

    if (!isSupabaseInitialized()) {
      ensureClient();
    } else {
      try {
        getSupabase();
      } catch (error) {
        console.warn('SupabaseReadyProvider detected initialized flag without client. Re-running init.', error);
        ensureClient();
      }
    }

    const handleReady = () => {
      updateReadyState();
      try {
        getSupabase();
      } catch (error) {
        console.error('SupabaseReadyProvider failed to access Supabase client after ready event:', error);
      }
    };

    const handleReset = () => {
      updateReadyState();
    };

    window.addEventListener('supabase-ready', handleReady);
    window.addEventListener('supabase-reset', handleReset);

    return () => {
      isMounted = false;
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
