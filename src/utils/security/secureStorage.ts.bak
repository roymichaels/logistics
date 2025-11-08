/**
 * Secure Storage Wrapper
 * Provides encrypted storage for sensitive data with automatic encryption/decryption
 */

import { EncryptionService } from './encryption';

export interface SecureStorageConfig {
  encryptionKey: CryptoKey;
  namespace?: string;
}

export class SecureStorage {
  private config: SecureStorageConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: SecureStorageConfig) {
    this.config = config;
  }

  /**
   * Store encrypted data
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const encrypted = await EncryptionService.encryptData(serializedValue, this.config.encryptionKey);

      const storageData = {
        ...encrypted,
        timestamp: Date.now(),
        version: '1.0'
      };

      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(storageData));

      // Update cache
      this.cache.set(key, value);
    } catch (error) {
      console.error('SecureStorage: Failed to store item', error);
      throw new Error(`Failed to store encrypted data for key: ${key}`);
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem<T = any>(key: string): Promise<T | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const storageKey = this.getStorageKey(key);
      const storageData = localStorage.getItem(storageKey);

      if (!storageData) {
        return null;
      }

      const { encrypted, iv, tag } = JSON.parse(storageData);
      const decryptedData = await EncryptionService.decryptData(encrypted, iv, tag, this.config.encryptionKey);
      const value = JSON.parse(decryptedData);

      // Update cache
      this.cache.set(key, value);

      return value;
    } catch (error) {
      console.error('SecureStorage: Failed to retrieve item', error);
      return null;
    }
  }

  /**
   * Remove encrypted data
   */
  async removeItem(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);
    this.cache.delete(key);
  }

  /**
   * Check if key exists
   */
  async hasItem(key: string): Promise<boolean> {
    if (this.cache.has(key)) {
      return true;
    }

    const storageKey = this.getStorageKey(key);
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Clear all data for this namespace
   */
  async clear(): Promise<void> {
    const namespace = this.config.namespace || 'secure';
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${namespace}_`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.cache.clear();
  }

  /**
   * Get all keys in this namespace
   */
  async getKeys(): Promise<string[]> {
    const namespace = this.config.namespace || 'secure';
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${namespace}_`)) {
        keys.push(key.substring(namespace.length + 1));
      }
    }

    return keys;
  }

  /**
   * Get storage statistics
   */
  async getStorageInfo(): Promise<{
    itemCount: number;
    totalSize: number;
    namespace: string;
  }> {
    const keys = await this.getKeys();
    let totalSize = 0;

    keys.forEach(key => {
      const storageKey = this.getStorageKey(key);
      const data = localStorage.getItem(storageKey);
      if (data) {
        totalSize += data.length;
      }
    });

    return {
      itemCount: keys.length,
      totalSize,
      namespace: this.config.namespace || 'secure'
    };
  }

  /**
   * Validate data integrity
   */
  async validateIntegrity(): Promise<{ valid: number; invalid: number; errors: string[] }> {
    const keys = await this.getKeys();
    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];

    for (const key of keys) {
      try {
        await this.getItem(key);
        valid++;
      } catch (error) {
        invalid++;
        errors.push(`Key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { valid, invalid, errors };
  }

  private getStorageKey(key: string): string {
    const namespace = this.config.namespace || 'secure';
    return `${namespace}_${key}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Secure Configuration Manager
 * Handles encrypted application configuration
 */
export class SecureConfigManager {
  private storage: SecureStorage;
  private static readonly CONFIG_KEY = 'app_config';

  constructor(encryptionKey: CryptoKey) {
    this.storage = new SecureStorage({
      encryptionKey,
      namespace: 'config'
    });
  }

  /**
   * Store configuration securely
   */
  async setConfig(config: any): Promise<void> {
    await this.storage.setItem(SecureConfigManager.CONFIG_KEY, config);
  }

  /**
   * Retrieve configuration
   */
  async getConfig<T = any>(): Promise<T | null> {
    return await this.storage.getItem<T>(SecureConfigManager.CONFIG_KEY);
  }

  /**
   * Update specific configuration value
   */
  async updateConfig(updates: any): Promise<void> {
    const currentConfig = await this.getConfig() || {};
    const newConfig = { ...currentConfig, ...updates };
    await this.setConfig(newConfig);
  }

  /**
   * Remove configuration
   */
  async clearConfig(): Promise<void> {
    await this.storage.removeItem(SecureConfigManager.CONFIG_KEY);
  }
}

/**
 * User Session Manager
 * Manages encrypted user session data
 */
export class SecureSessionManager {
  private storage: SecureStorage;
  private static readonly SESSION_KEY = 'user_session';

  constructor(encryptionKey: CryptoKey) {
    this.storage = new SecureStorage({
      encryptionKey,
      namespace: 'session'
    });
  }

  /**
   * Store user session
   */
  async setSession(sessionData: {
    userId: string;
    telegramId: string;
    role: string;
    permissions: string[];
    businessId?: string;
    expiresAt: string;
    [key: string]: any;
  }): Promise<void> {
    await this.storage.setItem(SecureSessionManager.SESSION_KEY, sessionData);
  }

  /**
   * Get current session
   */
  async getSession(): Promise<any | null> {
    const session = await this.storage.getItem(SecureSessionManager.SESSION_KEY);

    if (session && session.expiresAt) {
      if (new Date(session.expiresAt) < new Date()) {
        // Session expired, remove it
        await this.clearSession();
        return null;
      }
    }

    return session;
  }

  /**
   * Update session data
   */
  async updateSession(updates: any): Promise<void> {
    const currentSession = await this.getSession();
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      await this.setSession(updatedSession);
    }
  }

  /**
   * Clear session
   */
  async clearSession(): Promise<void> {
    await this.storage.removeItem(SecureSessionManager.SESSION_KEY);
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Extend session expiry
   */
  async extendSession(hours: number = 24): Promise<void> {
    const session = await this.getSession();
    if (session) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);
      await this.updateSession({ expiresAt: expiresAt.toISOString() });
    }
  }
}

/**
 * Secure Cache Manager
 * Temporary encrypted storage with TTL
 */
export class SecureCacheManager {
  private storage: SecureStorage;

  constructor(encryptionKey: CryptoKey) {
    this.storage = new SecureStorage({
      encryptionKey,
      namespace: 'cache'
    });
  }

  /**
   * Store data with TTL
   */
  async set(key: string, value: any, ttlMinutes: number = 60): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    const cacheData = {
      value,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };

    await this.storage.setItem(key, cacheData);
  }

  /**
   * Get cached data if not expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    const cacheData = await this.storage.getItem(key);

    if (!cacheData) {
      return null;
    }

    if (new Date(cacheData.expiresAt) < new Date()) {
      // Expired, remove it
      await this.storage.removeItem(key);
      return null;
    }

    return cacheData.value;
  }

  /**
   * Remove cached item
   */
  async remove(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  /**
   * Clear expired items
   */
  async clearExpired(): Promise<number> {
    const keys = await this.storage.getKeys();
    let cleared = 0;

    for (const key of keys) {
      const cacheData = await this.storage.getItem(key);
      if (cacheData && new Date(cacheData.expiresAt) < new Date()) {
        await this.storage.removeItem(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    await this.storage.clear();
  }
}