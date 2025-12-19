/**
 * User Identifier Utility
 * Handles the transition from telegram_id to wallet-based authentication
 */

import type { User } from '../data/types';

/**
 * Gets the primary identifier for a user
 * Priority: wallet_address > telegram_id > id
 */
export function getUserIdentifier(user: User | null | undefined): string {
  if (!user) return '';

  // Prefer wallet address for new auth system
  if (user.wallet_address) {
    return user.wallet_address;
  }

  // Fall back to telegram_id for legacy users
  if (user.telegram_id) {
    return user.telegram_id;
  }

  // Finally use user id
  return user.id;
}

/**
 * Gets the display identifier for a user
 * Priority: username > name > wallet_address (shortened) > telegram_id > id
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'Unknown';

  if (user.username) return user.username;
  if (user.name) return user.name;

  // Shorten wallet address for display
  if (user.wallet_address) {
    return `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;
  }

  if (user.telegram_id) return user.telegram_id;

  return user.id.slice(0, 8);
}

/**
 * Checks if a user has a modern wallet-based identity
 */
export function hasWalletIdentity(user: User | null | undefined): boolean {
  return !!user?.wallet_address;
}

/**
 * Checks if a user has a legacy telegram identity
 */
export function hasTelegramIdentity(user: User | null | undefined): boolean {
  return !!user?.telegram_id;
}

/**
 * Gets a safe user ID that can be used in queries
 * Returns null if user is invalid
 */
export function getSafeUserId(user: User | null | undefined): string | null {
  if (!user?.id) return null;
  return user.id;
}

/**
 * Creates a user identifier object for queries
 */
export function getUserQueryIdentifier(user: User | null | undefined): {
  id?: string;
  wallet_address?: string;
  telegram_id?: string;
} {
  if (!user) return {};

  return {
    id: user.id,
    wallet_address: user.wallet_address,
    telegram_id: user.telegram_id,
  };
}
