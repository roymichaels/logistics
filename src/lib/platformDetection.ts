/**
 * Platform Detection Service
 *
 * Detects the platform/context where the app is running:
 * - Telegram Mini App
 * - Standard Web Browser
 * - Mobile Web Browser
 * - Ethereum Wallet Browser
 * - Solana Wallet Browser
 */

export type Platform = 'telegram' | 'web' | 'mobile-web' | 'ethereum-wallet' | 'solana-wallet';

export interface PlatformInfo {
  platform: Platform;
  isTelegram: boolean;
  isWeb: boolean;
  isMobile: boolean;
  hasEthereumWallet: boolean;
  hasSolanaWallet: boolean;
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

    // Check for Telegram Mini App context
    const isTelegram = this.isTelegramContext();

    // Check for Web3 wallet availability
    const hasEthereumWallet = this.hasEthereumWallet();
    const hasSolanaWallet = this.hasSolanaWallet();

    // Determine primary platform
    let platform: Platform = 'web';

    if (isTelegram) {
      platform = 'telegram';
    } else if (hasSolanaWallet && isMobile) {
      platform = 'solana-wallet';
    } else if (hasEthereumWallet && isMobile) {
      platform = 'ethereum-wallet';
    } else if (isMobile) {
      platform = 'mobile-web';
    }

    this._info = {
      platform,
      isTelegram,
      isWeb: !isTelegram,
      isMobile,
      hasEthereumWallet,
      hasSolanaWallet,
      userAgent,
    };

    console.log('🔍 Platform detected:', this._info);

    return this._info;
  }

  /**
   * Get current platform info (cached)
   */
  get info(): PlatformInfo {
    return this._info || this.detect();
  }

  /**
   * Check if running in Telegram Mini App context
   */
  private isTelegramContext(): boolean {
    try {
      // Check for Telegram WebApp data
      const searchParams = new URLSearchParams(window.location.hash.slice(1));
      const tgWebAppData = searchParams.get('tgWebAppData');

      if (tgWebAppData) {
        return true;
      }

      // Check for Telegram WebApp in window object
      if (typeof window !== 'undefined') {
        const w = window as any;
        if (w.Telegram?.WebApp?.initData) {
          return true;
        }
      }

      // Check for Telegram in user agent
      if (navigator.userAgent.includes('Telegram')) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error detecting Telegram context:', error);
      return false;
    }
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
   * Get available authentication methods based on platform
   */
  getAvailableAuthMethods(): Array<'telegram' | 'ethereum' | 'solana'> {
    const info = this.info;
    const methods: Array<'telegram' | 'ethereum' | 'solana'> = [];

    if (info.isTelegram) {
      methods.push('telegram');
    }

    if (info.hasEthereumWallet) {
      methods.push('ethereum');
    }

    if (info.hasSolanaWallet) {
      methods.push('solana');
    }

    // If no methods detected, show all as options (user may need to install wallet)
    if (methods.length === 0 && info.isWeb) {
      methods.push('ethereum', 'solana');
    }

    return methods;
  }

  /**
   * Check if should show Telegram login option
   */
  shouldShowTelegramLogin(): boolean {
    return this.info.isTelegram;
  }

  /**
   * Check if should show Web3 login options
   */
  shouldShowWeb3Login(): boolean {
    return this.info.isWeb && !this.info.isTelegram;
  }

  /**
   * Check if should auto-authenticate via Telegram
   */
  shouldAutoAuthTelegram(): boolean {
    return this.info.isTelegram;
  }

  /**
   * Get recommended authentication method
   */
  getRecommendedAuthMethod(): 'telegram' | 'ethereum' | 'solana' | null {
    const info = this.info;

    if (info.isTelegram) {
      return 'telegram';
    }

    if (info.hasEthereumWallet) {
      return 'ethereum';
    }

    if (info.hasSolanaWallet) {
      return 'solana';
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
