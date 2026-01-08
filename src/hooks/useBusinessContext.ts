import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useAuth } from '../context/AuthContext';
import type { BusinessRecord } from '../services/business';

export interface BusinessContext {
  currentBusiness: BusinessRecord | null;
  businesses: BusinessRecord[];
  isOwner: boolean;
  isMultiBusinessOwner: boolean;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
}

export function useBusinessContext() {
  const { user } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState<BusinessRecord | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBusinesses = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        logger.error('[useBusinessContext] Failed to load businesses:', error);
        return;
      }

      const businessList = (data || []) as BusinessRecord[];
      setBusinesses(businessList);

      if (businessList.length > 0 && !currentBusiness) {
        setCurrentBusiness(businessList[0]);
      }

      logger.debug('[useBusinessContext] Businesses loaded:', businessList.length);
    } catch (err) {
      logger.error('[useBusinessContext] Error loading businesses:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentBusiness]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const switchBusiness = useCallback(async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      logger.info('[useBusinessContext] Switched to business:', business.name);
    }
  }, [businesses]);

  const refreshBusinesses = useCallback(async () => {
    await loadBusinesses();
  }, [loadBusinesses]);

  const isOwner = user?.role === 'business_owner' || businesses.length > 0;
  const isMultiBusinessOwner = businesses.length >= 2;

  return {
    currentBusiness,
    businesses,
    isOwner,
    isMultiBusinessOwner,
    switchBusiness,
    refreshBusinesses,
    loading
  };
}
