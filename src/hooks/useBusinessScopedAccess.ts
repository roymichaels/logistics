import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOptionalBusinessContext } from '../context/BusinessContext';
import { isBusinessScopedRole } from '../lib/roleUtils';

export interface BusinessScopedAccess {
  hasBusinessContext: boolean;
  isBusinessScopedRole: boolean;
  canAccessBusinessFeatures: boolean;
  currentBusinessId: string | null;
  currentBusinessName: string | null;
  loading: boolean;
}

export function useBusinessScopedAccess(): BusinessScopedAccess {
  const { role } = useAuth();
  const businessContext = useOptionalBusinessContext();

  return useMemo(() => {
    const isScoped = isBusinessScopedRole(role);
    const hasContext = !!businessContext?.activeBusiness;
    const loading = businessContext?.loading ?? false;

    return {
      hasBusinessContext: hasContext,
      isBusinessScopedRole: isScoped,
      canAccessBusinessFeatures: !isScoped || hasContext,
      currentBusinessId: businessContext?.activeBusiness?.id ?? null,
      currentBusinessName: businessContext?.activeBusiness?.name ?? null,
      loading
    };
  }, [role, businessContext?.activeBusiness, businessContext?.loading]);
}
