/**
 * PIN Authentication System
 * Handles secure PIN-based authentication with progressive lockout
 */

import { EncryptionService } from './encryption';

export interface PINSettings {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  pinLength: number;
  requirePinChange: boolean;
  pinChangeIntervalDays: number;
}

export interface PINValidationResult {
  success: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  requiresPinChange?: boolean;
  error?: string;
}

export interface PINData {
  hashedPin: string;
  salt: string;
  createdAt: string;
  lastChanged: string;
  failedAttempts: number;
  lockedUntil?: string;
  version: string;
}

export class PINAuthService {
  private static readonly STORAGE_KEY = 'pin_auth_data';
  private static readonly DEFAULT_SETTINGS: PINSettings = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    pinLength: 6,
    requirePinChange: false,
    pinChangeIntervalDays: 90
  };

  private settings: PINSettings;

  constructor(settings?: Partial<PINSettings>) {
    this.settings = { ...PINAuthService.DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Set up PIN for the first time
   */
  async setupPIN(pin: string): Promise<{ success: boolean; error?: string }> {
    if (!this.validatePINFormat(pin)) {
      return {
        success: false,
        error: `PIN must be ${this.settings.pinLength} digits`
      };
    }

    try {
      const salt = EncryptionService.generateSalt();
      const hashedPin = await this.hashPIN(pin, salt);

      const pinData: PINData = {
        hashedPin,
        salt: EncryptionService.arrayBufferToBase64(salt),
        createdAt: new Date().toISOString(),
        lastChanged: new Date().toISOString(),
        failedAttempts: 0,
        version: '1.0'
      };

      localStorage.setItem(PINAuthService.STORAGE_KEY, JSON.stringify(pinData));

      return { success: true };
    } catch (error) {
      console.error('PIN setup failed:', error);
      return {
        success: false,
        error: 'Failed to setup PIN'
      };
    }
  }

  /**
   * Verify PIN
   */
  async verifyPIN(pin: string): Promise<PINValidationResult> {
    const pinData = this.getPINData();

    if (!pinData) {
      return {
        success: false,
        error: 'PIN not set up'
      };
    }

    // Check if currently locked out
    if (pinData.lockedUntil && new Date(pinData.lockedUntil) > new Date()) {
      return {
        success: false,
        lockedUntil: new Date(pinData.lockedUntil),
        error: 'Account is temporarily locked'
      };
    }

    try {
      const salt = EncryptionService.base64ToArrayBuffer(pinData.salt);
      const hashedInputPin = await this.hashPIN(pin, new Uint8Array(salt));

      if (hashedInputPin === pinData.hashedPin) {
        // PIN is correct, reset failed attempts
        await this.resetFailedAttempts();

        // Check if PIN change is required
        const requiresPinChange = this.isPinChangeRequired(pinData);

        return {
          success: true,
          requiresPinChange
        };
      } else {
        // PIN is incorrect, increment failed attempts
        return await this.handleFailedAttempt(pinData);
      }
    } catch (error) {
      console.error('PIN verification failed:', error);
      return {
        success: false,
        error: 'PIN verification error'
      };
    }
  }

  /**
   * Change PIN
   */
  async changePIN(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    // Verify current PIN first
    const verification = await this.verifyPIN(currentPin);
    if (!verification.success) {
      return {
        success: false,
        error: 'Current PIN is incorrect'
      };
    }

    if (!this.validatePINFormat(newPin)) {
      return {
        success: false,
        error: `PIN must be ${this.settings.pinLength} digits`
      };
    }

    if (currentPin === newPin) {
      return {
        success: false,
        error: 'New PIN must be different from current PIN'
      };
    }

    try {
      const salt = EncryptionService.generateSalt();
      const hashedPin = await this.hashPIN(newPin, salt);

      const pinData = this.getPINData();
      if (pinData) {
        pinData.hashedPin = hashedPin;
        pinData.salt = EncryptionService.arrayBufferToBase64(salt);
        pinData.lastChanged = new Date().toISOString();
        pinData.failedAttempts = 0;
        delete pinData.lockedUntil;

        localStorage.setItem(PINAuthService.STORAGE_KEY, JSON.stringify(pinData));
      }

      return { success: true };
    } catch (error) {
      console.error('PIN change failed:', error);
      return {
        success: false,
        error: 'Failed to change PIN'
      };
    }
  }

  /**
   * Check if PIN is set up
   */
  isPINSetup(): boolean {
    return this.getPINData() !== null;
  }

  /**
   * Check if account is currently locked
   */
  isAccountLocked(): boolean {
    const pinData = this.getPINData();
    if (!pinData || !pinData.lockedUntil) {
      return false;
    }

    return new Date(pinData.lockedUntil) > new Date();
  }

  /**
   * Get lockout information
   */
  getLockoutInfo(): { isLocked: boolean; lockedUntil?: Date; remainingTime?: number } {
    const pinData = this.getPINData();
    if (!pinData || !pinData.lockedUntil) {
      return { isLocked: false };
    }

    const lockedUntil = new Date(pinData.lockedUntil);
    const now = new Date();

    if (lockedUntil > now) {
      return {
        isLocked: true,
        lockedUntil,
        remainingTime: lockedUntil.getTime() - now.getTime()
      };
    }

    return { isLocked: false };
  }

  /**
   * Reset PIN (admin function)
   */
  async resetPIN(): Promise<void> {
    localStorage.removeItem(PINAuthService.STORAGE_KEY);
  }

  /**
   * Get PIN settings
   */
  getSettings(): PINSettings {
    return { ...this.settings };
  }

  /**
   * Update PIN settings
   */
  updateSettings(newSettings: Partial<PINSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Generate master encryption key from PIN
   */
  async generateMasterKeyFromPIN(pin: string): Promise<CryptoKey | null> {
    const pinData = this.getPINData();
    if (!pinData) return null;

    try {
      const salt = EncryptionService.base64ToArrayBuffer(pinData.salt);
      return await EncryptionService.deriveKeyFromPIN(pin, new Uint8Array(salt));
    } catch (error) {
      console.error('Failed to generate master key from PIN:', error);
      return null;
    }
  }

  // Private methods

  private async hashPIN(pin: string, salt: Uint8Array): Promise<string> {
    const key = await EncryptionService.deriveKeyFromPIN(pin, salt);
    const exported = await EncryptionService.exportKey(key);
    return await EncryptionService.hashData(exported);
  }

  private validatePINFormat(pin: string): boolean {
    if (pin.length !== this.settings.pinLength) {
      return false;
    }

    return /^\d+$/.test(pin);
  }

  private getPINData(): PINData | null {
    try {
      const data = localStorage.getItem(PINAuthService.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve PIN data:', error);
      return null;
    }
  }

  private async handleFailedAttempt(pinData: PINData): Promise<PINValidationResult> {
    pinData.failedAttempts += 1;

    const remainingAttempts = this.settings.maxFailedAttempts - pinData.failedAttempts;

    if (pinData.failedAttempts >= this.settings.maxFailedAttempts) {
      // Lock account
      const lockoutDuration = this.calculateLockoutDuration(pinData.failedAttempts);
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + lockoutDuration);

      pinData.lockedUntil = lockedUntil.toISOString();

      localStorage.setItem(PINAuthService.STORAGE_KEY, JSON.stringify(pinData));

      return {
        success: false,
        lockedUntil,
        error: `Account locked for ${lockoutDuration} minutes`
      };
    } else {
      localStorage.setItem(PINAuthService.STORAGE_KEY, JSON.stringify(pinData));

      return {
        success: false,
        remainingAttempts,
        error: 'Incorrect PIN'
      };
    }
  }

  private async resetFailedAttempts(): Promise<void> {
    const pinData = this.getPINData();
    if (pinData) {
      pinData.failedAttempts = 0;
      delete pinData.lockedUntil;
      localStorage.setItem(PINAuthService.STORAGE_KEY, JSON.stringify(pinData));
    }
  }

  private calculateLockoutDuration(failedAttempts: number): number {
    // Progressive lockout: base duration * (failed attempts - max allowed)
    const baseMinutes = this.settings.lockoutDurationMinutes;
    const multiplier = Math.max(1, failedAttempts - this.settings.maxFailedAttempts + 1);
    return Math.min(baseMinutes * multiplier, 24 * 60); // Max 24 hours
  }

  private isPinChangeRequired(pinData: PINData): boolean {
    if (!this.settings.requirePinChange) {
      return false;
    }

    const lastChanged = new Date(pinData.lastChanged);
    const daysSinceChange = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceChange >= this.settings.pinChangeIntervalDays;
  }
}

/**
 * PIN Input Validation Utilities
 */
export class PINValidator {
  /**
   * Check PIN strength
   */
  static validatePINStrength(pin: string): {
    isValid: boolean;
    score: number; // 0-100
    warnings: string[];
  } {
    const warnings: string[] = [];
    let score = 0;

    // Check length
    if (pin.length === 6) {
      score += 30;
    } else {
      warnings.push('PIN must be 6 digits');
    }

    // Check for sequential numbers
    if (!this.hasSequentialDigits(pin)) {
      score += 20;
    } else {
      warnings.push('Avoid sequential numbers (123456)');
    }

    // Check for repeated digits
    if (!this.hasRepeatedDigits(pin)) {
      score += 20;
    } else {
      warnings.push('Avoid repeated digits (111111)');
    }

    // Check for common patterns
    if (!this.hasCommonPatterns(pin)) {
      score += 20;
    } else {
      warnings.push('Avoid common patterns');
    }

    // Check for uniqueness
    if (this.isUnique(pin)) {
      score += 10;
    }

    return {
      isValid: warnings.length === 0,
      score,
      warnings
    };
  }

  private static hasSequentialDigits(pin: string): boolean {
    const sequences = ['123456', '654321', '012345', '543210'];
    return sequences.some(seq => pin.includes(seq));
  }

  private static hasRepeatedDigits(pin: string): boolean {
    const repeated = ['111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '000000'];
    return repeated.includes(pin);
  }

  private static hasCommonPatterns(pin: string): boolean {
    const common = ['123123', '111222', '121212', '101010', '020202'];
    return common.some(pattern => pin.includes(pattern));
  }

  private static isUnique(pin: string): boolean {
    const uniqueDigits = new Set(pin).size;
    return uniqueDigits >= 4; // At least 4 different digits
  }
}