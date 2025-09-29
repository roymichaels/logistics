/**
 * Security Manager
 * Coordinates all security features including PIN auth, encryption, and secure storage
 */

import { PINAuthService } from './pinAuth';
import { EncryptionService } from './encryption';
import { SecureStorage, SecureSessionManager, SecureConfigManager } from './secureStorage';

export interface SecurityManagerConfig {
  userId: string;
  telegramId: string;
  requirePinForAccess: boolean;
  sessionTimeoutHours: number;
  requirePinChange: boolean;
  pinChangeIntervalDays: number;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  isPinAuthenticated: boolean;
  requiresPinSetup: boolean;
  requiresPinChange: boolean;
  sessionExpired: boolean;
  lockoutActive: boolean;
  lockoutRemaining?: number;
}

export class SecurityManager {
  private pinAuthService: PINAuthService;
  private masterKey: CryptoKey | null = null;
  private secureStorage: SecureStorage | null = null;
  private sessionManager: SecureSessionManager | null = null;
  private configManager: SecureConfigManager | null = null;
  private config: SecurityManagerConfig;

  constructor(config: SecurityManagerConfig) {
    this.config = config;
    this.pinAuthService = new PINAuthService({
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      pinLength: 6,
      requirePinChange: config.requirePinChange,
      pinChangeIntervalDays: config.pinChangeIntervalDays
    });
  }

  /**
   * Initialize security manager
   */
  async initialize(): Promise<void> {
    // Check if PIN is set up
    if (!this.pinAuthService.isPINSetup() && this.config.requirePinForAccess) {
      // PIN setup is required but not done yet
      return;
    }

    // Try to restore session if PIN is already authenticated
    if (this.pinAuthService.isPINSetup()) {
      await this.restoreEncryptedSession();
    }
  }

  /**
   * Get current authentication state
   */
  getAuthenticationState(): AuthenticationState {
    const lockoutInfo = this.pinAuthService.getLockoutInfo();
    const isPinSetup = this.pinAuthService.isPINSetup();

    return {
      isAuthenticated: this.masterKey !== null,
      isPinAuthenticated: this.masterKey !== null,
      requiresPinSetup: this.config.requirePinForAccess && !isPinSetup,
      requiresPinChange: false, // Will be set after PIN verification
      sessionExpired: false, // Will be checked against stored session
      lockoutActive: lockoutInfo.isLocked,
      lockoutRemaining: lockoutInfo.remainingTime
    };
  }

  /**
   * Setup PIN for first time
   */
  async setupPIN(pin: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.pinAuthService.setupPIN(pin);

    if (result.success) {
      // Generate master key from PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(pin);

      if (this.masterKey) {
        await this.initializeSecureServices();
        await this.createInitialSession();
      }
    }

    return result;
  }

  /**
   * Verify PIN and authenticate
   */
  async authenticateWithPIN(pin: string): Promise<{ success: boolean; error?: string; requiresPinChange?: boolean }> {
    const result = await this.pinAuthService.verifyPIN(pin);

    if (result.success) {
      // Generate master key from PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(pin);

      if (this.masterKey) {
        await this.initializeSecureServices();
        await this.createInitialSession();

        return {
          success: true,
          requiresPinChange: result.requiresPinChange
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate encryption key'
        };
      }
    }

    return {
      success: false,
      error: result.error
    };
  }

  /**
   * Change PIN
   */
  async changePIN(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.pinAuthService.changePIN(currentPin, newPin);

    if (result.success) {
      // Regenerate master key with new PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(newPin);

      if (this.masterKey) {
        // Re-encrypt all stored data with new key
        await this.reencryptStoredData();
        await this.createInitialSession();
      }
    }

    return result;
  }

  /**
   * Get secure storage instance
   */
  getSecureStorage(): SecureStorage | null {
    return this.secureStorage;
  }

  /**
   * Get session manager instance
   */
  getSessionManager(): SecureSessionManager | null {
    return this.sessionManager;
  }

  /**
   * Get config manager instance
   */
  getConfigManager(): SecureConfigManager | null {
    return this.configManager;
  }

  /**
   * Lock the application (clear master key)
   */
  lock(): void {
    this.masterKey = null;
    this.secureStorage = null;
    this.sessionManager = null;
    this.configManager = null;
  }

  /**
   * Reset all security data (emergency reset)
   */
  async emergencyReset(): Promise<void> {
    await this.pinAuthService.resetPIN();
    this.lock();

    // Clear all encrypted storage
    localStorage.removeItem('secure_user_data');
    localStorage.removeItem('secure_app_config');
    localStorage.removeItem('secure_session_data');

    // Clear any other security-related storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('secure_') || key.startsWith('encrypted_key_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Check session validity
   */
  async isSessionValid(): Promise<boolean> {
    if (!this.sessionManager || !this.masterKey) {
      return false;
    }

    return await this.sessionManager.isSessionValid();
  }

  /**
   * Extend current session
   */
  async extendSession(): Promise<void> {
    if (this.sessionManager) {
      await this.sessionManager.extendSession(this.config.sessionTimeoutHours);
    }
  }

  /**
   * Get encrypted chat key for a specific chat
   */
  async getChatEncryptionKey(chatId: string): Promise<CryptoKey | null> {
    if (!this.secureStorage) return null;

    try {
      const storedKey = await this.secureStorage.getItem(`chat_key_${chatId}`);
      if (storedKey) {
        return await EncryptionService.importKey(storedKey);
      }

      // Generate new key for this chat
      const newKey = await EncryptionService.generateSymmetricKey();
      const exportedKey = await EncryptionService.exportKey(newKey);
      await this.secureStorage.setItem(`chat_key_${chatId}`, exportedKey);

      return newKey;
    } catch (error) {
      console.error('Failed to get chat encryption key:', error);
      return null;
    }
  }

  // Private methods

  private async initializeSecureServices(): Promise<void> {
    if (!this.masterKey) return;

    this.secureStorage = new SecureStorage({
      encryptionKey: this.masterKey,
      namespace: `user_${this.config.userId}`
    });

    this.sessionManager = new SecureSessionManager(this.masterKey);
    this.configManager = new SecureConfigManager(this.masterKey);
  }

  private async createInitialSession(): Promise<void> {
    if (!this.sessionManager) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.sessionTimeoutHours);

    await this.sessionManager.setSession({
      userId: this.config.userId,
      telegramId: this.config.telegramId,
      role: 'authenticated',
      permissions: ['read', 'write'],
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
  }

  private async restoreEncryptedSession(): Promise<void> {
    // This would require the PIN to decrypt, so we can't automatically restore
    // The user will need to enter their PIN first
  }

  private async reencryptStoredData(): Promise<void> {
    if (!this.secureStorage) return;

    try {
      // Get all stored keys and re-encrypt with new master key
      const keys = await this.secureStorage.getKeys();
      const dataToReencrypt: Array<{ key: string; value: any }> = [];

      // Read all data first
      for (const key of keys) {
        const value = await this.secureStorage.getItem(key);
        if (value !== null) {
          dataToReencrypt.push({ key, value });
        }
      }

      // Clear old storage
      await this.secureStorage.clear();

      // Re-initialize with new master key
      await this.initializeSecureServices();

      // Re-store all data with new encryption
      if (this.secureStorage) {
        for (const { key, value } of dataToReencrypt) {
          await this.secureStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to re-encrypt stored data:', error);
      throw new Error('Failed to update encryption keys');
    }
  }
}

/**
 * Global Security Manager instance
 */
let globalSecurityManager: SecurityManager | null = null;

export function initializeGlobalSecurityManager(config: SecurityManagerConfig): SecurityManager {
  globalSecurityManager = new SecurityManager(config);
  return globalSecurityManager;
}

export function getGlobalSecurityManager(): SecurityManager | null {
  return globalSecurityManager;
}

export function clearGlobalSecurityManager(): void {
  globalSecurityManager = null;
}