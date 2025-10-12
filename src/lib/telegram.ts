interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
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
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: any) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: any, callback?: (buttonId: string) => void) => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
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

  constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
    }
  }

  get isAvailable(): boolean {
    return this.webApp !== null;
  }

  get initData(): string {
    return this.webApp?.initData || '';
  }

  get initDataUnsafe() {
    return this.webApp?.initDataUnsafe || {};
  }

  get user() {
    return this.webApp?.initDataUnsafe?.user || null;
  }

  get themeParams() {
    return this.webApp?.themeParams || {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#007aff',
      button_color: '#007aff',
      button_text_color: '#ffffff'
    };
  }

  ready() {
    this.webApp?.ready();
  }

  expand() {
    this.webApp?.expand();
  }

  close() {
    this.webApp?.close();
  }

  showAlert(message: string, callback?: () => void) {
    if (this.webApp) {
      this.webApp.showAlert(message, callback);
    } else {
      alert(message);
      callback?.();
    }
  }

  showConfirm(message: string, callback?: (confirmed: boolean) => void) {
    if (this.webApp) {
      this.webApp.showConfirm(message, callback);
    } else {
      const confirmed = confirm(message);
      callback?.(confirmed);
    }
  }

  hapticFeedback(type: 'impact' | 'notification' | 'selection', style?: string) {
    if (!this.webApp?.HapticFeedback) return;

    if (type === 'impact') {
      this.webApp.HapticFeedback.impactOccurred(style as any || 'medium');
    } else if (type === 'notification') {
      this.webApp.HapticFeedback.notificationOccurred(style as any || 'success');
    } else if (type === 'selection') {
      this.webApp.HapticFeedback.selectionChanged();
    }
  }

  get MainButton() {
    return this.webApp?.MainButton || null;
  }

  get BackButton() {
    return this.webApp?.BackButton || null;
  }

  openLink(url: string) {
    if (this.webApp) {
      this.webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  openTelegramLink(url: string) {
    if (this.webApp) {
      this.webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}

export const telegram = new TelegramService();
