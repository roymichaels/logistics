import { useAuth } from '@/context/AuthContext';
import { useBusinessContext } from './useBusinessContext';
import { useMemo } from 'react';

export type EntityType =
  | 'business'
  | 'product'
  | 'post'
  | 'profile'
  | 'order'
  | 'collection'
  | 'story'
  | 'inventory';

export interface EditPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManageMedia: boolean;
  canManageSettings: boolean;
  reason?: string;
}

interface UseEditPermissionsOptions {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  requireOnline?: boolean;
}

export function useEditPermissions({
  entityType,
  entityOwnerId,
  businessId,
  requireOnline = false,
}: UseEditPermissionsOptions): EditPermissions {
  const { user, profile } = useAuth();
  const { activeBusiness } = useBusinessContext();
  const isOnline = navigator.onLine;

  return useMemo(() => {
    if (!user || !profile) {
      return {
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canManageMedia: false,
        canManageSettings: false,
        reason: 'Not authenticated',
      };
    }

    if (requireOnline && !isOnline) {
      return {
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canManageMedia: false,
        canManageSettings: false,
        reason: 'Offline mode - editing disabled',
      };
    }

    const isOwner = entityOwnerId === user.id;
    const role = profile.role;

    switch (entityType) {
      case 'profile':
        return {
          canEdit: isOwner,
          canDelete: isOwner,
          canPublish: isOwner,
          canManageMedia: isOwner,
          canManageSettings: isOwner,
        };

      case 'business':
        const canManageBusiness =
          isOwner ||
          role === 'business_owner' ||
          role === 'manager';

        return {
          canEdit: canManageBusiness,
          canDelete: isOwner,
          canPublish: canManageBusiness,
          canManageMedia: canManageBusiness,
          canManageSettings: isOwner || role === 'manager',
        };

      case 'product':
        const canManageProducts =
          role === 'business_owner' ||
          role === 'manager' ||
          role === 'warehouse';

        return {
          canEdit: canManageProducts,
          canDelete: role === 'business_owner' || role === 'manager',
          canPublish: canManageProducts,
          canManageMedia: canManageProducts,
          canManageSettings: role === 'business_owner' || role === 'manager',
        };

      case 'inventory':
        const canManageInventory =
          role === 'business_owner' ||
          role === 'manager' ||
          role === 'warehouse';

        return {
          canEdit: canManageInventory,
          canDelete: role === 'business_owner' || role === 'manager',
          canPublish: canManageInventory,
          canManageMedia: false,
          canManageSettings: role === 'business_owner' || role === 'manager',
        };

      case 'order':
        const canManageOrders =
          role === 'business_owner' ||
          role === 'manager' ||
          role === 'dispatcher' ||
          role === 'customer_service';

        return {
          canEdit: canManageOrders,
          canDelete: role === 'business_owner' || role === 'manager',
          canPublish: false,
          canManageMedia: canManageOrders,
          canManageSettings: role === 'business_owner',
        };

      case 'post':
        return {
          canEdit: isOwner,
          canDelete: isOwner,
          canPublish: isOwner,
          canManageMedia: isOwner,
          canManageSettings: isOwner,
        };

      case 'collection':
        return {
          canEdit: isOwner,
          canDelete: isOwner,
          canPublish: isOwner,
          canManageMedia: isOwner,
          canManageSettings: isOwner,
        };

      case 'story':
        return {
          canEdit: isOwner,
          canDelete: isOwner,
          canPublish: isOwner,
          canManageMedia: isOwner,
          canManageSettings: isOwner,
        };

      default:
        return {
          canEdit: false,
          canDelete: false,
          canPublish: false,
          canManageMedia: false,
          canManageSettings: false,
          reason: 'Unknown entity type',
        };
    }
  }, [user, profile, entityOwnerId, entityType, isOnline, requireOnline]);
}
