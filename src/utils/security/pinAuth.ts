/**
 * PIN Authentication System
 * FRONTEND-ONLY MODE: PIN authentication disabled
 * Wallet authentication is the primary method
 */

import { logger } from '../../lib/logger';

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
  sessionToken?: string;
  expiresAt?: string;
}

export interface PINSetupResult {
  success: boolean;
  error?: string;
  message?: string;
}

export class PINAuthService {
  private static readonly DEFAULT_SETTINGS: PINSettings = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    pinLength: 6,
    requirePinChange: false,
    pinChangeIntervalDays: 90
  };

  private settings: PINSettings;
  private businessId?: string;

  constructor(settings?: Partial<PINSettings>, businessId?: string) {
    this.settings = { ...PINAuthService.DEFAULT_SETTINGS, ...settings };
    this.businessId = businessId;
  }

  /**
   * Set up PIN for the first time (not available in frontend-only mode)
   */
  async setupPIN(pin: string): Promise<PINSetupResult> {
    logger.warn('[FRONTEND-ONLY] PIN setup not available - use wallet authentication');

    return {
      success: false,
      error: 'PIN authentication not available in frontend-only mode'
    };
  }

  /**
   * Verify PIN (not available in frontend-only mode)
   */
  async verifyPIN(pin: string): Promise<PINValidationResult> {
    logger.warn('[FRONTEND-ONLY] PIN verification not available - use wallet authentication');

    return {
      success: false,
      error: 'PIN authentication not available in frontend-only mode'
    };
  }

  /**
   * Change PIN (not available in frontend-only mode)
   */
  async changePIN(_currentPin: string, _newPin: string): Promise<PINSetupResult> {
    logger.warn('[FRONTEND-ONLY] PIN change not available - use wallet authentication');

    return {
      success: false,
      error: 'PIN authentication not available in frontend-only mode'
    };
  }

  /**
   * Check if PIN is set up (always false in frontend-only mode)
   */
  async isPINSetup(): Promise<boolean> {
    logger.debug('[FRONTEND-ONLY] PIN authentication not available');
    return false;
  }

  /**
   * Check if account is currently locked (always false in frontend-only mode)
   */
  async isAccountLocked(): Promise<boolean> {
    logger.debug('[FRONTEND-ONLY] Account locking not available');
    return false;
  }

  /**
   * Get lockout information (always unlocked in frontend-only mode)
   */
  async getLockoutInfo(): Promise<{ isLocked: boolean; lockedUntil?: Date; remainingTime?: number }> {
    logger.debug('[FRONTEND-ONLY] Account locking not available');
    return { isLocked: false };
  }

  /**
   * Check if PIN session is valid
   */
  async hasValidSession(): Promise<boolean> {
    const sessionData = this.getPINSession();
    if (!sessionData) {
      return false;
    }

    // Check if session expired
    if (new Date(sessionData.expiresAt) <= new Date()) {
      this.clearPINSession();
      return false;
    }

    return true;
  }

  /**
   * Clear PIN session
   */
  clearPINSession(): void {
    try {
      localStorage.removeItem('pin_session');
    } catch (error) {
      logger.error('Failed to clear PIN session:', error);
    }
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

  // Private methods

  private validatePINFormat(pin: string): boolean {
    if (pin.length !== this.settings.pinLength) {
      return false;
    }

    return /^\d+$/.test(pin);
  }

  private storePINSession(sessionToken: string, expiresAt: string): void {
    try {
      const sessionData = {
        token: sessionToken,
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('pin_session', JSON.stringify(sessionData));
    } catch (error) {
      logger.error('Failed to store PIN session:', error);
    }
  }

  private getPINSession(): { token: string; expiresAt: string; createdAt: string } | null {
    try {
      const data = localStorage.getItem('pin_session');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to retrieve PIN session:', error);
      return null;
    }
  }

  private markPINAsSetup(): void {
    try {
      localStorage.setItem('pin_setup_status', 'true');
    } catch (error) {
      logger.error('Failed to mark PIN as setup:', error);
    }
  }

  private isLocallyMarkedAsSetup(): boolean {
    try {
      return localStorage.getItem('pin_setup_status') === 'true';
    } catch (error) {
      return false;
    }
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
    score: number;
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
    return uniqueDigits >= 4;
  }
}
