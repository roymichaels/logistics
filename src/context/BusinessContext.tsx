import React, { createContext, useContext, useEffect, useState } from 'react';
import { businessContextManager, Business, BusinessContextState } from '../lib/businessContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface BusinessContextValue extends BusinessContextState {
  switchBusiness: (business: Business) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

interface BusinessContextProviderProps {
  children: React.ReactNode;
}

export function BusinessContextProvider({ children }: BusinessContextProviderProps) {
  const { user, role } = useAuth();
  const [state, setState] = useState<BusinessContextState>(businessContextManager.getState());

  useEffect(() => {
    const unsubscribe = businessContextManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && role === 'business_owner') {
      refreshBusinesses();
    } else {
      businessContextManager.reset();
    }
  }, [user, role]);

  const refreshBusinesses = async () => {
    if (!user) return;

    businessContextManager.setLoading(true);

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[BusinessContext] Failed to fetch businesses', error);
        return;
      }

      businessContextManager.setOwnedBusinesses(data || []);
    } catch (error) {
      logger.error('[BusinessContext] Exception while fetching businesses', error);
    } finally {
      businessContextManager.setLoading(false);
    }
  };

  const switchBusiness = (business: Business) => {
    businessContextManager.setActiveBusiness(business);
  };

  const value: BusinessContextValue = {
    ...state,
    switchBusiness,
    refreshBusinesses,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within BusinessContextProvider');
  }
  return context;
}

export function useOptionalBusinessContext() {
  return useContext(BusinessContext);
}
