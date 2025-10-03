interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerHeight: number;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isProgressVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

class TelegramService {
  private webApp: TelegramWebApp | null = null;
  private userData: any = null;

  constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;

      console.log('🎬 Telegram WebApp initialized', {
        version: this.webApp.version,
        platform: this.webApp.platform,
        hasInitData: !!this.webApp.initData,
        initDataLength: this.webApp.initData?.length || 0,
        hasInitDataUnsafe: !!this.webApp.initDataUnsafe,
        hasUser: !!this.webApp.initDataUnsafe?.user
      });

      this.webApp.ready();
      this.webApp.expand();

      // Parse user data from initDataUnsafe
      if (this.webApp.initDataUnsafe?.user) {
        this.userData = this.webApp.initDataUnsafe.user;
        console.log('✅ Telegram user data loaded:', {
          id: this.userData.id,
          username: this.userData.username,
          firstName: this.userData.first_name
        });
      } else {
        console.warn('⚠️ No user data in initDataUnsafe');
      }
    } else {
      console.log('🌐 Not running in Telegram WebApp environment');
    }
  }

  get isAvailable(): boolean {
    return this.webApp !== null;
  }

  get isTelegramEnv(): boolean {
    return this.webApp !== null;
  }

  get themeParams() {
    return this.webApp?.themeParams || {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#007aff',
      button_color: '#007aff',
      button_text_color: '#ffffff',
      secondary_bg_color: '#f1f1f1'
    };
  }

  get initData(): string {
    return this.webApp?.initData || '';
  }

  get initDataUnsafe(): any {
    return this.webApp?.initDataUnsafe || null;
  }

  get user(): any {
    return this.userData || this.webApp?.initDataUnsafe?.user || null;
  }

  get isAuthenticated(): boolean {
    return !!(this.userData || this.webApp?.initDataUnsafe?.user);
  }

  setMainButton({ text, visible = true, onClick }: { text: string; visible?: boolean; onClick: () => void }): void {
    if (!this.webApp) return;
    
    this.webApp.MainButton.setText(text);
    this.webApp.MainButton.onClick(onClick);
    if (visible) {
      this.webApp.MainButton.show();
    } else {
      this.webApp.MainButton.hide();
    }
  }

  hideMainButton(): void {
    if (!this.webApp) return;
    this.webApp.MainButton.hide();
  }

  setBackButton(onClick: () => void): void {
    if (!this.webApp) return;
    
    this.webApp.BackButton.onClick(onClick);
    this.webApp.BackButton.show();
  }

  hideBackButton(): void {
    if (!this.webApp) return;
    this.webApp.BackButton.hide();
  }

  hapticFeedback(type: 'selection' | 'impact' | 'notification', style?: 'light' | 'medium' | 'heavy' | 'error' | 'success' | 'warning'): void {
    if (!this.webApp) return;

    switch (type) {
      case 'selection':
        this.webApp.HapticFeedback.selectionChanged();
        break;
      case 'impact':
        this.webApp.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy' || 'light');
        break;
      case 'notification':
        this.webApp.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning' || 'success');
        break;
    }
  }

  showAlert(message: string): void {
    if (this.webApp) {
      this.webApp.showAlert(message);
    } else {
      // Fallback for non-Telegram environment
      console.log('Alert:', message);
    }
  }

  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp && this.webApp.showConfirm) {
        // Use Telegram's built-in confirm dialog
        this.webApp.showConfirm(message, (confirmed: boolean) => {
          resolve(confirmed);
        });
      } else {
        // Fallback for non-Telegram environment
        console.log('Confirm:', message);
        resolve(confirm(message));
      }
    });
  }

  close(): void {
    if (this.webApp) {
      this.webApp.close();
    }
  }

  onEvent(eventType: string, handler: () => void): void {
    if (this.webApp) {
      this.webApp.onEvent(eventType, handler);
    }
  }

  offEvent(eventType: string, handler: () => void): void {
    if (this.webApp) {
      this.webApp.offEvent(eventType, handler);
    }
  }
}

export const telegram = new TelegramService();