import { useMemo } from 'react';
import { getUserDisplayName } from '../utils/userIdentifier';
import type { User } from '../data/types';

/**
 * Hook to get a consistent, formatted display name for a user
 * Returns shortened wallet address format (e.g., "0xd040...2dfc5") if no name/username
 *
 * @param user - User object or null/undefined
 * @returns Formatted display name suitable for UI display
 */
export function useUserDisplayName(user: User | null | undefined): string {
  return useMemo(() => getUserDisplayName(user), [user]);
}

/**
 * Hook to get display name for the current user or a custom user
 * Useful when you need to display user names consistently across the app
 *
 * @param user - User object to display, or null/undefined
 * @param fallback - Optional fallback text if user is null/undefined
 * @returns Formatted display name or fallback
 */
export function useUserDisplay(
  user: User | null | undefined,
  fallback: string = 'Unknown'
): string {
  return useMemo(() => {
    if (!user) return fallback;
    return getUserDisplayName(user);
  }, [user, fallback]);
}
