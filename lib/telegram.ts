import WebApp from '@twa-dev/sdk';

/**
 * Telegram Mini App Service
 *
 * This service provides a clean interface to interact with Telegram Mini Apps SDK.
 * Uses @twa-dev/sdk for proper TypeScript support and Mini App integration.
 *
 * Key differences from old approach:
 * - No need for manual window.Telegram checks
 * - No need for api_id or api_hash (those are for Telegram Client SDK, not Mini Apps)
 * - Proper TypeScript types built-in
 * - Works exclusively within Telegram Mini App context
 */
class TelegramService {
  private initialized = false;
  private userData: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check if running in Telegram Mini App context
      if (!WebApp.initData) {
        console.log('🌐 Not running in Telegram Mini App environment');
        console.log('   This app must be opened from inside Telegram using the Mini App button');
        this.initialized = false;
        return;
      }

      console.log('🎬 Telegram Mini App SDK initialized', {
        version: WebApp.version,
        platform: WebApp.platform,
        hasInitData: !!WebApp.initData,
        initDataLength: WebApp.initData?.length || 0,
        hasUser: !!WebApp.initDataUnsafe?.user
      });

      // Signal that Mini App is ready
      WebApp.ready();

      // Expand to full height
      WebApp.expand();

      // Store user data
      if (WebApp.initDataUnsafe?.user) {
        this.userData = WebApp.initDataUnsafe.user;
        console.log('✅ Telegram user data loaded:', {
          id: this.userData.id,
          username: this.userData.username,
          firstName: this.userData.first_name
        });
      } else {
        console.warn('⚠️ No user data in initDataUnsafe');
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
    return this.initialized && !!WebApp.initData;
  }

  /**
   * Check if running in Telegram environment
   */
  get isTelegramEnv(): boolean {
    return this.initialized;
  }

  /**
   * Get Telegram theme parameters
   */
  get themeParams() {
    return WebApp.themeParams || {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#007aff',
      button_color: '#007aff',
      button_text_color: '#ffffff',
      secondary_bg_color: '#f1f1f1'
    };
  }

  /**
   * Get raw initData string (for backend verification)
   */
  get initData(): string {
    return WebApp.initData || '';
  }

  /**
   * Get parsed initData object
   */
  get initDataUnsafe(): any {
    return WebApp.initDataUnsafe || null;
  }

  /**
   * Get current user data
   */
  get user(): any {
    return this.userData || WebApp.initDataUnsafe?.user || null;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!(this.userData || WebApp.initDataUnsafe?.user);
  }

  /**
   * Get Telegram SDK version
   */
  get version(): string {
    return WebApp.version;
  }

  /**
   * Get platform (ios, android, tdesktop, etc.)
   */
  get platform(): string {
    return WebApp.platform;
  }

  /**
   * Get color scheme (light or dark)
   */
  get colorScheme(): string {
    return WebApp.colorScheme;
  }

  /**
   * Configure and show the main button
   */
  setMainButton({ text, visible = true, onClick }: { text: string; visible?: boolean; onClick: () => void }): void {
    if (!this.isAvailable) return;

    try {
      WebApp.MainButton.setText(text);
      WebApp.MainButton.onClick(onClick);

      if (visible) {
        WebApp.MainButton.show();
      } else {
        WebApp.MainButton.hide();
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
      WebApp.MainButton.hide();
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
      WebApp.BackButton.onClick(onClick);
      WebApp.BackButton.show();
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
      WebApp.BackButton.hide();
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
          WebApp.HapticFeedback.selectionChanged();
          break;
        case 'impact':
          WebApp.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy' || 'light');
          break;
        case 'notification':
          WebApp.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning' || 'success');
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
        WebApp.showAlert(message);
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
          WebApp.showConfirm(message, (confirmed: boolean) => {
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
          WebApp.showPopup(params, (buttonId: string | null) => {
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
      WebApp.close();
    }
  }

  /**
   * Open a link
   */
  openLink(url: string, options?: { try_instant_view?: boolean }): void {
    if (this.isAvailable) {
      try {
        WebApp.openLink(url, options);
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
        WebApp.openTelegramLink(url);
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
        WebApp.requestContact((success, data) => {
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
        WebApp.enableClosingConfirmation();
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
        WebApp.disableClosingConfirmation();
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
        WebApp.onEvent(eventType, handler);
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
        WebApp.offEvent(eventType, handler);
      } catch (error) {
        console.log(`[Telegram] Event ${eventType} not supported`);
      }
    }
  }
}

// Export singleton instance
export const telegram = new TelegramService();
