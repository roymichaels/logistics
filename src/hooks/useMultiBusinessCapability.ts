import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface MultiBusinessCapability {
  isMultiBusinessOwner: boolean;
  ownedBusinesses: Array<{ id: string; name: string }>;
  loading: boolean;
  error: string | null;
}

/**
 * Multi-Business Owner Capability Hook
 *
 * This is a COMPUTED CAPABILITY, not a stored role.
 * Per the canonical knowledgebase:
 * - A business_owner who owns 2+ businesses automatically gains multi-business capabilities
 * - This is derived from data (businesses.owner_id count)
 * - It is NOT a flag, NOT manually assigned, NOT a stored role
 *
 * The capability provides:
 * - Portfolio dashboard access
 * - Cross-business analytics
 * - Business switcher UI
 * - Create new businesses
 * - Duplicate configs between owned businesses
 *
 * Cannot:
 * - Access platform-wide data
 * - Override RLS
 * - See businesses they don't own
 */
export function useMultiBusinessCapability(): MultiBusinessCapability {
  const { user, role } = useAuth();
  const [ownedBusinesses, setOwnedBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOwnedBusinesses() {
      if (!user || role !== 'business_owner') {
        setOwnedBusinesses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setOwnedBusinesses(data || []);

        logger.info('[MultiBusinessCapability] Computed capability', {
          userId: user.id,
          businessCount: data?.length || 0,
          isMultiBusinessOwner: (data?.length || 0) >= 2,
        });
      } catch (err) {
        logger.error('[MultiBusinessCapability] Failed to fetch owned businesses', err);
        setError(err instanceof Error ? err.message : 'Failed to load businesses');
        setOwnedBusinesses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOwnedBusinesses();
  }, [user, role]);

  const isMultiBusinessOwner = role === 'business_owner' && ownedBusinesses.length >= 2;

  return {
    isMultiBusinessOwner,
    ownedBusinesses,
    loading,
    error,
  };
}
