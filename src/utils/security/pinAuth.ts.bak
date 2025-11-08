/**
 * PIN Authentication System
 * Handles secure PIN-based authentication with database backend
 * All PIN operations go through Supabase Edge Functions for security
 */

import { getSupabase } from '../../lib/supabaseClient';

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
   * Set up PIN for the first time (stored securely in database)
   */
  async setupPIN(pin: string): Promise<PINSetupResult> {
    if (!this.validatePINFormat(pin)) {
      return {
        success: false,
        error: `PIN must be ${this.settings.pinLength} digits`
      };
    }

    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      const { data, error } = await supabase.functions.invoke('pin-verify', {
        body: {
          operation: 'setup',
          pin: pin
        }
      });

      if (error) {
        console.error('PIN setup error:', error);
        return {
          success: false,
          error: error.message || 'Failed to setup PIN'
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to setup PIN'
        };
      }

      // Store setup status locally for quick checks
      this.markPINAsSetup();

      return {
        success: true,
        message: data.message || 'PIN setup successfully'
      };
    } catch (error) {
      console.error('PIN setup failed:', error);
      return {
        success: false,
        error: 'Failed to setup PIN'
      };
    }
  }

  /**
   * Verify PIN (against database with proper hashing)
   */
  async verifyPIN(pin: string): Promise<PINValidationResult> {
    if (!this.validatePINFormat(pin)) {
      return {
        success: false,
        error: 'Invalid PIN format'
      };
    }

    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      const { data, error } = await supabase.functions.invoke('pin-verify', {
        body: {
          operation: 'verify',
          pin: pin,
          business_id: this.businessId
        }
      });

      if (error) {
        console.error('PIN verification error:', error);
        return {
          success: false,
          error: error.message || 'Failed to verify PIN'
        };
      }

      if (!data.success) {
        const result: PINValidationResult = {
          success: false,
          error: data.error || 'Incorrect PIN'
        };

        if (data.remaining_attempts !== undefined) {
          result.remainingAttempts = data.remaining_attempts;
        }

        if (data.locked_until) {
          result.lockedUntil = new Date(data.locked_until);
        }

        return result;
      }

      // Store session token locally for subsequent requests
      if (data.session_token) {
        this.storePINSession(data.session_token, data.expires_at);
      }

      return {
        success: true,
        sessionToken: data.session_token,
        expiresAt: data.expires_at
      };
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
  async changePIN(currentPin: string, newPin: string): Promise<PINSetupResult> {
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
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      const { data, error } = await supabase.functions.invoke('pin-reset', {
        body: {
          operation: 'change',
          current_pin: currentPin,
          new_pin: newPin
        }
      });

      if (error) {
        console.error('PIN change error:', error);
        return {
          success: false,
          error: error.message || 'Failed to change PIN'
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to change PIN'
        };
      }

      return {
        success: true,
        message: data.message || 'PIN changed successfully'
      };
    } catch (error) {
      console.error('PIN change failed:', error);
      return {
        success: false,
        error: 'Failed to change PIN'
      };
    }
  }

  /**
   * Check if PIN is set up (check database)
   */
  async isPINSetup(): Promise<boolean> {
    // First check local cache for quick response
    const localCheck = this.isLocallyMarkedAsSetup();
    if (localCheck) {
      return true;
    }

    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return false;
      }

      const telegramId = session.user?.user_metadata?.telegram_id;
      if (!telegramId) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_pins')
        .select('telegram_id')
        .eq('telegram_id', telegramId.toString())
        .maybeSingle();

      const hasPin = !error && data !== null;

      if (hasPin) {
        this.markPINAsSetup();
      }

      return hasPin;
    } catch (error) {
      console.error('Failed to check PIN setup status:', error);
      return false;
    }
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return false;
      }

      const telegramId = session.user?.user_metadata?.telegram_id;
      if (!telegramId) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_pins')
        .select('locked_until')
        .eq('telegram_id', telegramId.toString())
        .maybeSingle();

      if (error || !data || !data.locked_until) {
        return false;
      }

      return new Date(data.locked_until) > new Date();
    } catch (error) {
      console.error('Failed to check lockout status:', error);
      return false;
    }
  }

  /**
   * Get lockout information
   */
  async getLockoutInfo(): Promise<{ isLocked: boolean; lockedUntil?: Date; remainingTime?: number }> {
    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return { isLocked: false };
      }

      const telegramId = session.user?.user_metadata?.telegram_id;
      if (!telegramId) {
        return { isLocked: false };
      }

      const { data, error } = await supabase
        .from('user_pins')
        .select('locked_until')
        .eq('telegram_id', telegramId.toString())
        .maybeSingle();

      if (error || !data || !data.locked_until) {
        return { isLocked: false };
      }

      const lockedUntil = new Date(data.locked_until);
      const now = new Date();

      if (lockedUntil > now) {
        return {
          isLocked: true,
          lockedUntil,
          remainingTime: lockedUntil.getTime() - now.getTime()
        };
      }

      return { isLocked: false };
    } catch (error) {
      console.error('Failed to get lockout info:', error);
      return { isLocked: false };
    }
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
      console.error('Failed to clear PIN session:', error);
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
      console.error('Failed to store PIN session:', error);
    }
  }

  private getPINSession(): { token: string; expiresAt: string; createdAt: string } | null {
    try {
      const data = localStorage.getItem('pin_session');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve PIN session:', error);
      return null;
    }
  }

  private markPINAsSetup(): void {
    try {
      localStorage.setItem('pin_setup_status', 'true');
    } catch (error) {
      console.error('Failed to mark PIN as setup:', error);
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
