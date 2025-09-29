import { useEffect, useState } from 'react';
import { telegram } from '../../lib/telegram';

interface TelegramUIState {
  theme: any;
  mainButton: {
    show: (text: string, onClick: () => void) => void;
    hide: () => void;
    setLoading: (loading: boolean) => void;
  };
  backButton: {
    show: (onClick: () => void) => void;
    hide: () => void;
  };
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  alert: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

export function useTelegramUI(): TelegramUIState {
  const [theme, setTheme] = useState(telegram.themeParams);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(telegram.themeParams);
    };

    if (telegram.isAvailable) {
      telegram.onEvent('themeChanged', handleThemeChange);
      return () => telegram.offEvent('themeChanged', handleThemeChange);
    }
  }, []);

  return {
    theme,
    mainButton: {
      show: (text: string, onClick: () => void) => {
        telegram.setMainButton(text, onClick);
      },
      hide: () => {
        telegram.hideMainButton();
      },
      setLoading: (loading: boolean) => {
        if (loading) {
          telegram.setMainButton('Loading...', () => {});
        }
      }
    },
    backButton: {
      show: (onClick: () => void) => {
        telegram.setBackButton(onClick);
      },
      hide: () => {
        telegram.hideBackButton();
      }
    },
    haptic: (type = 'light') => {
      telegram.hapticFeedback(type === 'light' ? 'selection' : 'impact', type);
    },
    alert: (message: string) => {
      telegram.showAlert(message);
    },
    confirm: (message: string) => {
      return telegram.showConfirm(message);
    }
  };
}