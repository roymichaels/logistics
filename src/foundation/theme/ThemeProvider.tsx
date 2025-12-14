import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { logger } from '../../lib/logger';

export type ThemeVariant = 'telegramx' | 'twitter' | 'royal' | 'swiss';

export interface ThemeConfig {
  variant: ThemeVariant;
  mode: 'light' | 'dark';
}

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setVariant: (variant: ThemeVariant) => void;
  setMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'app-theme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeConfig;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme || { variant: 'telegramx', mode: 'dark' };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[Theme] Failed to load theme from storage', error);
    }

    return defaultTheme || { variant: 'telegramx', mode: 'dark' };
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.variant);
    document.documentElement.setAttribute('data-mode', theme.mode);

    logger.info('[Theme] Theme applied', theme);
  }, [theme]);

  const setTheme = useCallback((partial: Partial<ThemeConfig>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...partial };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
          logger.error('[Theme] Failed to save theme to storage', error);
        }
      }

      return next;
    });
  }, []);

  const setVariant = useCallback(
    (variant: ThemeVariant) => {
      setTheme({ variant });
    },
    [setTheme]
  );

  const setMode = useCallback(
    (mode: 'light' | 'dark') => {
      setTheme({ mode });
    },
    [setTheme]
  );

  const value: ThemeContextValue = {
    theme,
    setTheme,
    setVariant,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
