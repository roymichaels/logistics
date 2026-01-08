import { logger } from './logger';

const WALLET_USER_MAPPING_KEY = 'wallet-user-id-mapping';

interface WalletUserMapping {
  [walletAddress: string]: {
    supabaseUserId: string;
    walletType: 'ethereum' | 'solana' | 'ton';
    createdAt: number;
  };
}

/**
 * Manages persistent mapping between wallet addresses and Supabase user IDs.
 * This ensures wallet users always get the same user ID across sessions.
 */
export class WalletUserMappingManager {
  private normalizeWalletAddress(address: string): string {
    return address.toLowerCase().trim();
  }

  /**
   * Get all wallet-to-user-id mappings
   */
  private getAllMappings(): WalletUserMapping {
    try {
      const stored = localStorage.getItem(WALLET_USER_MAPPING_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      logger.error('[WalletMapping] Failed to load mappings:', error);
      return {};
    }
  }

  /**
   * Save all mappings to localStorage
   */
  private saveMappings(mappings: WalletUserMapping): void {
    try {
      localStorage.setItem(WALLET_USER_MAPPING_KEY, JSON.stringify(mappings));
      logger.debug('[WalletMapping] Mappings saved successfully');
    } catch (error) {
      logger.error('[WalletMapping] Failed to save mappings:', error);
    }
  }

  /**
   * Get the Supabase user ID for a wallet address
   */
  getUserIdForWallet(walletAddress: string): string | null {
    const normalized = this.normalizeWalletAddress(walletAddress);
    const mappings = this.getAllMappings();
    const mapping = mappings[normalized];

    if (mapping) {
      logger.debug('[WalletMapping] Found existing user ID for wallet:', {
        wallet: normalized,
        userId: mapping.supabaseUserId,
      });
      return mapping.supabaseUserId;
    }

    logger.debug('[WalletMapping] No existing user ID found for wallet:', normalized);
    return null;
  }

  /**
   * Set the Supabase user ID for a wallet address
   */
  setUserIdForWallet(
    walletAddress: string,
    supabaseUserId: string,
    walletType: 'ethereum' | 'solana' | 'ton'
  ): void {
    const normalized = this.normalizeWalletAddress(walletAddress);
    const mappings = this.getAllMappings();

    const existing = mappings[normalized];
    if (existing && existing.supabaseUserId !== supabaseUserId) {
      logger.warn('[WalletMapping] Overwriting existing mapping for wallet:', {
        wallet: normalized,
        oldUserId: existing.supabaseUserId,
        newUserId: supabaseUserId,
      });
    }

    mappings[normalized] = {
      supabaseUserId,
      walletType,
      createdAt: existing?.createdAt || Date.now(),
    };

    this.saveMappings(mappings);

    logger.info('[WalletMapping] Mapped wallet to user ID:', {
      wallet: normalized,
      userId: supabaseUserId,
      walletType,
    });
  }

  /**
   * Remove the mapping for a wallet address
   */
  removeWalletMapping(walletAddress: string): void {
    const normalized = this.normalizeWalletAddress(walletAddress);
    const mappings = this.getAllMappings();

    if (mappings[normalized]) {
      delete mappings[normalized];
      this.saveMappings(mappings);
      logger.info('[WalletMapping] Removed mapping for wallet:', normalized);
    }
  }

  /**
   * Get all wallet addresses mapped to a specific user ID
   */
  getWalletsForUserId(supabaseUserId: string): string[] {
    const mappings = this.getAllMappings();
    return Object.entries(mappings)
      .filter(([_, mapping]) => mapping.supabaseUserId === supabaseUserId)
      .map(([wallet, _]) => wallet);
  }

  /**
   * Check if a wallet has an existing mapping
   */
  hasMapping(walletAddress: string): boolean {
    const normalized = this.normalizeWalletAddress(walletAddress);
    const mappings = this.getAllMappings();
    return normalized in mappings;
  }

  /**
   * Clear all mappings (use with caution)
   */
  clearAllMappings(): void {
    localStorage.removeItem(WALLET_USER_MAPPING_KEY);
    logger.warn('[WalletMapping] All wallet mappings cleared');
  }
}

export const walletUserMapping = new WalletUserMappingManager();
