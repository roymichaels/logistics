import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from './useBusinessContext';
import { logger } from '@/lib/logger';

export function useRequiredBusiness(options?: {
  redirectTo?: string;
  throwError?: boolean;
}) {
  const { activeBusiness, loading } = useBusinessContext();
  const navigate = useNavigate();

  const redirectTo = options?.redirectTo || '/businesses';
  const throwError = options?.throwError ?? false;

  useEffect(() => {
    if (!loading && !activeBusiness) {
      logger.warn('useRequiredBusiness', 'No active business context', {
        redirectTo,
        throwError,
      });

      if (throwError) {
        throw new Error('Business context is required for this operation');
      }

      if (redirectTo) {
        navigate(redirectTo);
      }
    }
  }, [activeBusiness, loading, navigate, redirectTo, throwError]);

  return {
    activeBusiness,
    loading,
    hasBusinessContext: !!activeBusiness && !loading,
  };
}

export function useRequiredBusinessId(): string {
  const { activeBusiness, loading } = useRequiredBusiness({ throwError: true });

  if (loading) {
    throw new Error('Business context is still loading');
  }

  if (!activeBusiness?.id) {
    throw new Error('No active business context available');
  }

  return activeBusiness.id;
}
