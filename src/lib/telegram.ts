/**
 * Telegram Mini App Service
 *
 * This service provides a clean interface to interact with Telegram Mini Apps SDK.
 * Now supports optional Telegram integration - works in both Telegram and standard web contexts.
 */
class TelegramService {
  private initialized = false;
  private userData: any = null;
  private WebApp: any = null;
  private sdkLoaded = false;

  constructor() {
    this.loadSDK();
  }

  private async loadSDK() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Try to dynamically import Telegram SDK
      const module = await import('@twa-dev/sdk');
      this.WebApp = module.default;
      this.sdkLoaded = true;
      this.initialize();
    } catch (error) {
      console.log('🌐 Telegram SDK not available - running in standard web mode');
      this.sdkLoaded = false;
      this.initialized = false;
    }
  }

  private initialize() {
    try {
      // Check if SDK is loaded
      if (!this.sdkLoaded || !this.WebApp) {
        this.initialized = false;
        return;
      }

      // Check if running in Telegram Mini App context
      if (!this.WebApp.initData) {
        this.initialized = false;
        return;
      }

      // Signal that Mini App is ready
      this.WebApp.ready();

      // Expand to full height
      this.WebApp.expand();

      // Store user data
      if (this.WebApp.initDataUnsafe?.user) {
        this.userData = this.WebApp.initDataUnsafe.user;
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram SDK:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if Telegram Mini App SDK is available and initialized
   */
  get isAvailable(): boolean {
    return this.initialized && !!this.WebApp && !!this.WebApp.initData;
  }

  /**
   * Check if running in Telegram environment
   */
  get isTelegramEnv(): boolean {
    return this.initialized;
  }

  /**
   * Get Telegram theme parameters
   * Defaults to Twitter/X dark mode theme
   */
  get themeParams() {
    return this.WebApp?.themeParams || {
      bg_color: '#15202B',
      text_color: '#E7E9EA',
      hint_color: '#8899A6',
      link_color: '#1D9BF0',
      button_color: '#1D9BF0',
      button_text_color: '#FFFFFF',
      secondary_bg_color: '#192734'
    };
  }

  /**
   * Get raw initData string (for backend verification)
   */
  get initData(): string {
    return this.WebApp?.initData || '';
  }

  /**
   * Get parsed initData object
   */
  get initDataUnsafe(): any {
    return this.WebApp?.initDataUnsafe || null;
  }

  /**
   * Get current user data
   */
  get user(): any {
    return this.userData || this.WebApp?.initDataUnsafe?.user || null;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!(this.userData || this.WebApp?.initDataUnsafe?.user);
  }

  /**
   * Get Telegram SDK version
   */
  get version(): string {
    return this.WebApp?.version || '';
  }

  /**
   * Get platform (ios, android, tdesktop, etc.)
   */
  get platform(): string {
    return this.WebApp?.platform || 'web';
  }

  /**
   * Get color scheme (light or dark)
   */
  get colorScheme(): string {
    return this.WebApp?.colorScheme || 'light';
  }

  /**
   * Configure and show the main button
   */
  setMainButton({ text, visible = true, onClick }: { text: string; visible?: boolean; onClick: () => void }): void {
    if (!this.isAvailable) return;

    try {
      this.WebApp.MainButton.setText(text);
      this.WebApp.MainButton.onClick(onClick);

      if (visible) {
        this.WebApp.MainButton.show();
      } else {
        this.WebApp.MainButton.hide();
      }
    } catch (error) {
      console.log('[Telegram] MainButton error:', error);
    }
  }

  /**
   * Hide the main button
   */
  hideMainButton(): void {
    if (!this.isAvailable) return;

    try {
      this.WebApp.MainButton.hide();
    } catch (error) {
      console.log('[Telegram] MainButton hide error:', error);
    }
  }

  /**
   * Show and configure the back button
   */
  setBackButton(onClick: () => void): void {
    if (!this.isAvailable) return;

    try {
      this.WebApp.BackButton.onClick(onClick);
      this.WebApp.BackButton.show();
    } catch (error) {
      console.log('[Telegram] BackButton not supported in this version');
    }
  }

  /**
   * Hide the back button
   */
  hideBackButton(): void {
    if (!this.isAvailable) return;

    try {
      this.WebApp.BackButton.hide();
    } catch (error) {
      console.log('[Telegram] BackButton hide error:', error);
    }
  }

  /**
   * Trigger haptic feedback
   */
  hapticFeedback(
    type: 'selection' | 'impact' | 'notification',
    style?: 'light' | 'medium' | 'heavy' | 'error' | 'success' | 'warning'
  ): void {
    if (!this.isAvailable) return;

    try {
      switch (type) {
        case 'selection':
          this.WebApp.HapticFeedback.selectionChanged();
          break;
        case 'impact':
          this.WebApp.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy' || 'light');
          break;
        case 'notification':
          this.WebApp.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning' || 'success');
          break;
      }
    } catch (error) {
      console.log('[Telegram] HapticFeedback not supported in this version');
    }
  }

  /**
   * Show an alert dialog
   */
  showAlert(message: string): void {
    if (this.isAvailable) {
      try {
        this.WebApp.showAlert(message);
      } catch (error) {
        console.log('[Telegram] showAlert not supported, using fallback');
        alert(message);
      }
    } else {
      alert(message);
    }
  }

  /**
   * Show a confirm dialog
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isAvailable) {
        try {
          this.WebApp.showConfirm(message, (confirmed: boolean) => {
            resolve(confirmed);
          });
        } catch (error) {
          console.log('[Telegram] showConfirm not supported, using fallback');
          resolve(confirm(message));
        }
      } else {
        resolve(confirm(message));
      }
    });
  }

  /**
   * Show a popup with buttons
   */
  showPopup(params: any): Promise<string | null> {
    return new Promise((resolve) => {
      if (this.isAvailable) {
        try {
          this.WebApp.showPopup(params, (buttonId: string | null) => {
            resolve(buttonId);
          });
        } catch (error) {
          console.log('[Telegram] showPopup not supported, using alert fallback');
          alert(params.message || '');
          resolve(null);
        }
      } else {
        alert(params.message || '');
        resolve(null);
      }
    });
  }

  /**
   * Close the Mini App
   */
  close(): void {
    if (this.isAvailable) {
      this.WebApp.close();
    }
  }

  /**
   * Open a link
   */
  openLink(url: string, options?: { try_instant_view?: boolean }): void {
    if (this.isAvailable) {
      try {
        this.WebApp.openLink(url, options);
      } catch (error) {
        console.log('[Telegram] openLink error:', error);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Open a Telegram link
   */
  openTelegramLink(url: string): void {
    if (this.isAvailable) {
      try {
        this.WebApp.openTelegramLink(url);
      } catch (error) {
        console.log('[Telegram] openTelegramLink error:', error);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Request contact information
   */
  requestContact(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable) {
        reject(new Error('Telegram SDK not available'));
        return;
      }

      try {
        this.WebApp.requestContact((success, data) => {
          if (success) {
            resolve(data);
          } else {
            reject(new Error('Contact request cancelled'));
          }
        });
      } catch (error) {
        console.log('[Telegram] requestContact not supported');
        reject(error);
      }
    });
  }

  /**
   * Enable closing confirmation
   */
  enableClosingConfirmation(): void {
    if (this.isAvailable) {
      try {
        this.WebApp.enableClosingConfirmation();
      } catch (error) {
        console.log('[Telegram] enableClosingConfirmation not supported');
      }
    }
  }

  /**
   * Disable closing confirmation
   */
  disableClosingConfirmation(): void {
    if (this.isAvailable) {
      try {
        this.WebApp.disableClosingConfirmation();
      } catch (error) {
        console.log('[Telegram] disableClosingConfirmation not supported');
      }
    }
  }

  /**
   * Listen for events
   */
  onEvent(eventType: string, handler: () => void): void {
    if (this.isAvailable) {
      try {
        this.WebApp.onEvent(eventType, handler);
      } catch (error) {
        console.log(`[Telegram] Event ${eventType} not supported`);
      }
    }
  }

  /**
   * Remove event listener
   */
  offEvent(eventType: string, handler: () => void): void {
    if (this.isAvailable) {
      try {
        this.WebApp.offEvent(eventType, handler);
      } catch (error) {
        console.log(`[Telegram] Event ${eventType} not supported`);
      }
    }
  }
}

// Export singleton instance
export const telegram = new TelegramService();
