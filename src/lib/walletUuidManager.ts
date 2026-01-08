import { logger } from './logger';

const WALLET_UUID_MAP_KEY = 'wallet-uuid-map';

export interface WalletUuidMapping {
  wallet: string;
  uuid: string;
  walletType: 'ethereum' | 'solana' | 'ton';
  createdAt: number;
}

class WalletUuidManager {
  private cache: Map<string, string> = new Map();

  private generateDeterministicUuid(): string {
    return crypto.randomUUID();
  }

  private normalizeWalletAddress(address: string): string {
    return address.toLowerCase().trim();
  }

  private loadMappings(): Record<string, WalletUuidMapping> {
    try {
      const stored = localStorage.getItem(WALLET_UUID_MAP_KEY);
      if (!stored) return {};
      return JSON.parse(stored);
    } catch (error) {
      logger.error('[WALLET-UUID] Failed to load mappings', error);
      return {};
    }
  }

  private saveMappings(mappings: Record<string, WalletUuidMapping>): void {
    try {
      localStorage.setItem(WALLET_UUID_MAP_KEY, JSON.stringify(mappings));
    } catch (error) {
      logger.error('[WALLET-UUID] Failed to save mappings', error);
    }
  }

  getOrCreateUuid(
    walletAddress: string,
    walletType: 'ethereum' | 'solana' | 'ton'
  ): string {
    const normalizedAddress = this.normalizeWalletAddress(walletAddress);

    if (this.cache.has(normalizedAddress)) {
      return this.cache.get(normalizedAddress)!;
    }

    const mappings = this.loadMappings();
    const existing = mappings[normalizedAddress];

    if (existing) {
      logger.info(`[WALLET-UUID] Found existing UUID for wallet: ${normalizedAddress}`);
      this.cache.set(normalizedAddress, existing.uuid);
      return existing.uuid;
    }

    const newUuid = this.generateDeterministicUuid();
    const mapping: WalletUuidMapping = {
      wallet: normalizedAddress,
      uuid: newUuid,
      walletType,
      createdAt: Date.now(),
    };

    mappings[normalizedAddress] = mapping;
    this.saveMappings(mappings);
    this.cache.set(normalizedAddress, newUuid);

    logger.info(`[WALLET-UUID] Generated new UUID for wallet: ${normalizedAddress}`);
    return newUuid;
  }

  getUuid(walletAddress: string): string | null {
    const normalizedAddress = this.normalizeWalletAddress(walletAddress);

    if (this.cache.has(normalizedAddress)) {
      return this.cache.get(normalizedAddress)!;
    }

    const mappings = this.loadMappings();
    const existing = mappings[normalizedAddress];

    if (existing) {
      this.cache.set(normalizedAddress, existing.uuid);
      return existing.uuid;
    }

    return null;
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('[WALLET-UUID] Cache cleared');
  }

  getAllMappings(): WalletUuidMapping[] {
    const mappings = this.loadMappings();
    return Object.values(mappings);
  }

  clearAllMappings(): void {
    try {
      localStorage.removeItem(WALLET_UUID_MAP_KEY);
      this.cache.clear();
      logger.info('[WALLET-UUID] All mappings cleared');
    } catch (error) {
      logger.error('[WALLET-UUID] Failed to clear mappings', error);
    }
  }
}

export const walletUuidManager = new WalletUuidManager();
