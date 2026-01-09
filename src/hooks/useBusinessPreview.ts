import { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';
import {
  getCompleteBusinessData,
  toggleBusinessFollow,
  isUserFollowingBusiness,
  CompleteBusinessData,
} from '../services/businessPreview';
import { updateBusiness, BusinessRecord } from '../services/business';

export interface UseBusinessPreviewOptions {
  businessId: string;
  userId?: string;
  includeAnalytics?: boolean;
}

export interface UseBusinessPreviewResult {
  data: CompleteBusinessData | null;
  loading: boolean;
  error: Error | null;
  isFollowing: boolean;
  refetch: () => Promise<void>;
  updateBusinessField: (field: string, value: any) => Promise<void>;
  toggleFollow: () => Promise<void>;
}

export function useBusinessPreview({
  businessId,
  userId,
  includeAnalytics = false,
}: UseBusinessPreviewOptions): UseBusinessPreviewResult {
  const [data, setData] = useState<CompleteBusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.info('[useBusinessPreview] Fetching business data', { businessId });

      const businessData = await getCompleteBusinessData(businessId, includeAnalytics);
      setData(businessData);

      // Check if user is following
      if (userId) {
        const followStatus = await isUserFollowingBusiness(businessId, userId);
        setIsFollowing(followStatus);
      }

      logger.info('[useBusinessPreview] Successfully loaded business data');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load business data');
      logger.error('[useBusinessPreview] Error loading business data', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [businessId, userId, includeAnalytics]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateBusinessField = useCallback(
    async (field: string, value: any) => {
      if (!data?.business) {
        throw new Error('No business data loaded');
      }

      try {
        logger.info('[useBusinessPreview] Updating business field', { field, value });

        const updated = await updateBusiness(data.business.id, { [field]: value });

        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            business: updated,
          };
        });

        logger.info('[useBusinessPreview] Business field updated successfully');
      } catch (error) {
        logger.error('[useBusinessPreview] Failed to update business field', error);
        throw error;
      }
    },
    [data?.business]
  );

  const toggleFollow = useCallback(async () => {
    if (!userId || !businessId) {
      throw new Error('User must be authenticated to follow businesses');
    }

    try {
      logger.info('[useBusinessPreview] Toggling follow status', { businessId, userId, isFollowing });

      const newFollowStatus = await toggleBusinessFollow(businessId, userId, isFollowing);
      setIsFollowing(newFollowStatus);

      // Update follower count locally
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            followers_count: prev.stats.followers_count + (newFollowStatus ? 1 : -1),
          },
        };
      });

      logger.info('[useBusinessPreview] Follow status updated', { newFollowStatus });
    } catch (error) {
      logger.error('[useBusinessPreview] Failed to toggle follow', error);
      throw error;
    }
  }, [businessId, userId, isFollowing]);

  return {
    data,
    loading,
    error,
    isFollowing,
    refetch: fetchData,
    updateBusinessField,
    toggleFollow,
  };
}
