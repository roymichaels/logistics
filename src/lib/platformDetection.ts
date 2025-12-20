/**
 * Platform Detection Service
 *
 * Detects the platform/context where the app is running:
 * - Standard Web Browser
 * - Mobile Web Browser
 * - Ethereum Wallet Browser
 * - Solana Wallet Browser
 * - TON Wallet Browser
 */

import { logger } from './logger';

export type Platform = 'web' | 'mobile-web' | 'ethereum-wallet' | 'solana-wallet' | 'ton-wallet';

export interface PlatformInfo {
  platform: Platform;
  isWeb: boolean;
  isMobile: boolean;
  hasEthereumWallet: boolean;
  hasSolanaWallet: boolean;
  hasTonWallet: boolean;
  userAgent: string;
}

class PlatformDetectionService {
  private _info: PlatformInfo | null = null;

  /**
   * Detect the current platform
   */
  detect(): PlatformInfo {
    if (this._info) {
      return this._info;
    }

    const userAgent = navigator.userAgent || '';
    const isMobile = this.isMobileDevice(userAgent);

    // Check for Web3 wallet availability
    const hasEthereumWallet = this.hasEthereumWallet();
    const hasSolanaWallet = this.hasSolanaWallet();
    const hasTonWallet = this.hasTonWallet();

    // Determine primary platform
    let platform: Platform = 'web';

    if (hasTonWallet && isMobile) {
      platform = 'ton-wallet';
    } else if (hasSolanaWallet && isMobile) {
      platform = 'solana-wallet';
    } else if (hasEthereumWallet && isMobile) {
      platform = 'ethereum-wallet';
    } else if (isMobile) {
      platform = 'mobile-web';
    }

    this._info = {
      platform,
      isWeb: true,
      isMobile,
      hasEthereumWallet,
      hasSolanaWallet,
      hasTonWallet,
      userAgent,
    };

    logger.info('Platform detected', this._info);

    return this._info;
  }

  /**
   * Get current platform info (cached)
   */
  get info(): PlatformInfo {
    return this._info || this.detect();
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(userAgent: string): boolean {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
  }

  /**
   * Check if Ethereum wallet is available
   */
  private hasEthereumWallet(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const w = window as any;

    // Check for MetaMask or other Ethereum providers
    return !!(w.ethereum || w.web3);
  }

  /**
   * Check if Solana wallet is available
   */
  private hasSolanaWallet(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const w = window as any;

    // Check for Phantom or other Solana wallets
    return !!(w.solana || w.phantom?.solana);
  }

  /**
   * Check if TON wallet is available
   */
  private hasTonWallet(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const w = window as any;

    // Check for Tonkeeper, OpenMask, or other TON wallets
    return !!(w.ton || w.tonkeeper || w.tonProtocol);
  }

  /**
   * Get available authentication methods based on platform
   */
  getAvailableAuthMethods(): Array<'ethereum' | 'solana' | 'ton'> {
    const info = this.info;
    const methods: Array<'ethereum' | 'solana' | 'ton'> = [];

    if (info.hasEthereumWallet) {
      methods.push('ethereum');
    }

    if (info.hasSolanaWallet) {
      methods.push('solana');
    }

    if (info.hasTonWallet) {
      methods.push('ton');
    }

    // Always show all options so users can install wallets if needed
    if (methods.length === 0) {
      methods.push('ethereum', 'solana', 'ton');
    }

    return methods;
  }

  /**
   * Check if should show Web3 login options
   */
  shouldShowWeb3Login(): boolean {
    return this.info.isWeb;
  }

  /**
   * Get recommended authentication method
   */
  getRecommendedAuthMethod(): 'ethereum' | 'solana' | 'ton' | null {
    const info = this.info;

    if (info.hasEthereumWallet) {
      return 'ethereum';
    }

    if (info.hasSolanaWallet) {
      return 'solana';
    }

    if (info.hasTonWallet) {
      return 'ton';
    }

    return null;
  }

  /**
   * Reset cached platform info (useful for testing)
   */
  reset(): void {
    this._info = null;
  }
}

// Export singleton instance
export const platformDetection = new PlatformDetectionService();
