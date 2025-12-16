// Telegram stub - removed from architecture
// This file exists only to prevent build errors in legacy components

export const telegram = {
  ready: () => {},
  expand: () => {},
  close: () => {},
  BackButton: {
    show: () => {},
    hide: () => {},
    onClick: () => {},
  },
  MainButton: {
    show: () => {},
    hide: () => {},
    setText: () => {},
    onClick: () => {},
  },
  themeParams: {},
  hapticFeedback: (type: string) => {},
  showAlert: (message: string) => {},
  isAvailable: false,
  initDataUnsafe: {},
  version: '0.0.0',
};

export const isTelegramWebApp = () => false;
export const getTelegramUser = () => null;
export const initTelegram = () => {};
