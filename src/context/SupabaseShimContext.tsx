import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initSupabaseShim, getSupabaseShim, isSupabaseShimInitialized } from '../lib/supabaseClientShim';
import { logger } from '../lib/logger';

export interface SupabaseShimContextValue {
  isSupabaseReady: boolean;
  setSupabaseReady: React.Dispatch<React.SetStateAction<boolean>>;
  markSupabaseReady: () => void;
  markSupabaseNotReady: () => void;
}

const SupabaseShimContext = createContext<SupabaseShimContextValue | undefined>(undefined);

interface SupabaseShimProviderProps {
  children: React.ReactNode;
  value?: SupabaseShimContextValue;
}

export function SupabaseShimProvider({ children, value }: SupabaseShimProviderProps) {
  const initialReady = isSupabaseShimInitialized();
  logger.info('SupabaseShimProvider: Initializing, isSupabaseShimInitialized:', initialReady);
  const [isReady, setIsReady] = useState(() => initialReady);

  useEffect(() => {
    if (value) {
      return;
    }

    let isMounted = true;

    const updateReadyState = () => {
      if (!isMounted) {
        return;
      }
      setIsReady(isSupabaseShimInitialized());
    };

    updateReadyState();

    if (typeof window === 'undefined') {
      return () => {
        isMounted = false;
      };
    }

    const ensureClient = async () => {
      try {
        await initSupabaseShim();
        if (!isMounted) {
          return;
        }
        getSupabaseShim();
        setIsReady(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        logger.error('Failed to initialize Supabase shim in SupabaseShimProvider:', error);
        setIsReady(false);
      }
    };

    if (!isSupabaseShimInitialized()) {
      ensureClient();
    } else {
      try {
        getSupabaseShim();
      } catch (error) {
        logger.warn('SupabaseShimProvider detected initialized flag without client. Re-running init.', error);
        ensureClient();
      }
    }

    const handleReady = () => {
      updateReadyState();
      try {
        getSupabaseShim();
      } catch (error) {
        logger.error('SupabaseShimProvider failed to access Supabase shim after ready event:', error);
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

  const markSupabaseReady = React.useCallback(() => setIsReady(true), []);
  const markSupabaseNotReady = React.useCallback(() => setIsReady(false), []);

  const contextValue = useMemo(() => ({
    isSupabaseReady: isReady,
    setSupabaseReady: setIsReady,
    markSupabaseReady,
    markSupabaseNotReady
  }), [isReady, markSupabaseReady, markSupabaseNotReady]);

  logger.info('SupabaseShimProvider: Rendering, isReady:', isReady);

  return (
    <SupabaseShimContext.Provider value={value ?? contextValue}>
      {children}
    </SupabaseShimContext.Provider>
  );
}

export function useSupabaseReady(): SupabaseShimContextValue {
  const context = useContext(SupabaseShimContext);
  if (!context) {
    throw new Error('useSupabaseReady must be used within a SupabaseShimProvider');
  }
  return context;
}
