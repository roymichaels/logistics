/**
 * Dynamic Permission System
 *
 * Replaces hardcoded rolePermissions.ts with data-driven permission checking
 * that fetches permissions from the database via the resolve-permissions Edge Function.
 */

import { logger } from './logger';
import { supabase } from './supabaseClient';
import type { PermissionProfile } from '../services/types';

export type ResolvedPermissions = PermissionProfile;

// In-memory cache for permission resolution
const permissionsCache = new Map<string, { data: ResolvedPermissions; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for user + business context
 */
function getCacheKey(userId: string, businessId?: string | null): string {
  return `${userId}:${businessId || 'global'}`;
}

/**
 * Resolve permissions for a user in a specific business context
 */
export async function resolveUserPermissions(
  userId: string,
  businessId?: string | null
): Promise<ResolvedPermissions> {
  const cacheKey = getCacheKey(userId, businessId);

  // Check in-memory cache
  const cached = permissionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Call Edge Function to resolve permissions
  const { data, error } = await supabase.functions.invoke('resolve-permissions', {
    body: { user_id: userId, business_id: businessId },
  });

  if (error) {
    logger.error('Failed to resolve permissions:', error);
    throw new Error(`Permission resolution failed: ${error.message}`);
  }

  // Cache the result
  permissionsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permission: string,
  businessId?: string | null
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return resolved.permissions.includes(permission);
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[],
  businessId?: string | null
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return permissions.some(p => resolved.permissions.includes(p));
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[],
  businessId?: string | null
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return permissions.every(p => resolved.permissions.includes(p));
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string,
  businessId?: string | null
): Promise<string[]> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return resolved.permissions;
  } catch (error) {
    logger.error('Failed to get user permissions:', error);
    return [];
  }
}

/**
 * Check if user can see financial data
 */
export async function canViewFinancials(
  userId: string,
  businessId?: string | null
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return resolved.can_see_financials;
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check if user can see data across multiple businesses
 */
export async function canViewCrossBusinessData(
  userId: string
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId);
    return resolved.can_see_cross_business;
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Invalidate permissions cache for a user
 */
export function invalidatePermissionsCache(userId: string, businessId?: string | null): void {
  const cacheKey = getCacheKey(userId, businessId);
  permissionsCache.delete(cacheKey);
}

/**
 * Clear all permissions cache
 */
export function clearAllPermissionsCache(): void {
  permissionsCache.clear();
}

/**
 * Synchronous permission check using cached data only
 * Use this for UI rendering when you've already loaded permissions
 */
export function hasPermissionSync(
  cachedPermissions: ResolvedPermissions | null,
  permission: string
): boolean {
  if (!cachedPermissions) return false;
  return cachedPermissions.permissions.includes(permission);
}

/**
 * Get user's scope level
 */
export async function getUserScopeLevel(
  userId: string,
  businessId?: string | null
): Promise<'infrastructure' | 'business'> {
  try {
    const resolved = await resolveUserPermissions(userId, businessId);
    return resolved.scope_level;
  } catch (error) {
    logger.error('Failed to get scope level:', error);
    return 'business';
  }
}

/**
 * Check if user requires business context to operate
 */
export async function requiresBusinessContext(userId: string): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId);
    // Infrastructure owners don't need business context
    return resolved.scope_level === 'business';
  } catch (error) {
    logger.error('Failed to check business context requirement:', error);
    return true;
  }
}
