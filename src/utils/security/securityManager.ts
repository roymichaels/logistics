/**
 * Security Manager
 * Coordinates all security features including PIN auth, encryption, and secure storage
 */

import { PINAuthService } from './pinAuth';
import { EncryptionService } from './encryption';
import { SecureStorage, SecureSessionManager, SecureConfigManager } from './secureStorage';
import { getSecurityAuditLogger } from './auditLogger';

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
  private auditLogger = getSecurityAuditLogger();

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
    const isPinSetup = await this.pinAuthService.isPINSetup();
    if (!isPinSetup && this.config.requirePinForAccess) {
      // PIN setup is required but not done yet
      return;
    }

    // Try to restore session if PIN is already authenticated
    if (isPinSetup) {
      await this.restoreEncryptedSession();
    }
  }

  /**
   * Get current authentication state
   */
  async getAuthenticationState(): Promise<AuthenticationState> {
    const lockoutInfo = await this.pinAuthService.getLockoutInfo();
    const isPinSetup = await this.pinAuthService.isPINSetup();

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

    // Log PIN setup attempt
    await this.auditLogger.logSecurityEvent({
      eventType: 'pin_setup',
      userId: this.config.telegramId,
      details: {
        setupMethod: 'user_initiated',
        timestamp: new Date().toISOString()
      },
      success: result.success,
      riskLevel: result.success ? 'low' : 'medium'
    });

    if (result.success) {
      // Generate master key from PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(pin);

      if (this.masterKey) {
        await this.initializeSecureServices();
        await this.createInitialSession();

        // Log successful initialization
        await this.auditLogger.logSecurityEvent({
          eventType: 'login_attempt',
          userId: this.config.telegramId,
          details: {
            method: 'pin_setup',
            securityLevel: 'high',
            encryptionEnabled: true
          },
          success: true,
          riskLevel: 'low'
        });
      }
    }

    return result;
  }

  /**
   * Verify PIN and authenticate
   */
  async authenticateWithPIN(pin: string): Promise<{ success: boolean; error?: string; requiresPinChange?: boolean; failureCount?: number }> {
    const lockoutInfo = await this.pinAuthService.getLockoutInfo();
    const result = await this.pinAuthService.verifyPIN(pin);

    // Log PIN verification attempt with detailed context
    await this.auditLogger.logPINAttempt(
      this.config.telegramId,
      result.success,
      lockoutInfo.failedAttempts
    );

    if (result.success) {
      // Generate master key from PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(pin);

      if (this.masterKey) {
        await this.initializeSecureServices();
        await this.createInitialSession();

        // Log successful authentication
        await this.auditLogger.logSessionActivity(
          this.config.telegramId,
          'created'
        );

        return {
          success: true,
          requiresPinChange: result.requiresPinChange
        };
      } else {
        // Log encryption key generation failure
        await this.auditLogger.logSecurityEvent({
          eventType: 'suspicious_activity',
          userId: this.config.telegramId,
          details: {
            issue: 'master_key_generation_failed',
            pinVerifySuccess: true,
            timestamp: new Date().toISOString()
          },
          success: false,
          riskLevel: 'high'
        });

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

    // Log PIN change attempt
    await this.auditLogger.logSecurityEvent({
      eventType: 'pin_change',
      userId: this.config.telegramId,
      details: {
        changeMethod: 'user_initiated',
        timestamp: new Date().toISOString(),
        reencryptionRequired: true
      },
      success: result.success,
      riskLevel: result.success ? 'low' : 'medium'
    });

    if (result.success) {
      // Regenerate master key with new PIN
      this.masterKey = await this.pinAuthService.generateMasterKeyFromPIN(newPin);

      if (this.masterKey) {
        // Re-encrypt all stored data with new key
        await this.reencryptStoredData();
        await this.createInitialSession();

        // Log successful data re-encryption
        await this.auditLogger.logSecurityEvent({
          eventType: 'key_rotation',
          userId: this.config.telegramId,
          details: {
            trigger: 'pin_change',
            dataReencrypted: true,
            timestamp: new Date().toISOString()
          },
          success: true,
          riskLevel: 'low'
        });
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
  async lock(): Promise<void> {
    // Log session termination
    await this.auditLogger.logSessionActivity(
      this.config.telegramId,
      'terminated'
    );

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
      logger.error('Failed to get chat encryption key:', error);
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
      logger.error('Failed to re-encrypt stored data:', error);
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