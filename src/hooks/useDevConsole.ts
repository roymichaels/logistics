/**
 * useDevConsole Hook
 *
 * Manages the unified developer console state and keyboard shortcuts.
 * Press Ctrl+Shift+D (or Cmd+Shift+D on Mac) to toggle the console.
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

const DEV_CONSOLE_STORAGE_KEY = 'dev_console_enabled';

export function useDevConsole() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem(DEV_CONSOLE_STORAGE_KEY);
    if (savedState === 'true') {
      setIsOpen(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => {
          const newState = !prev;
          localStorage.setItem(DEV_CONSOLE_STORAGE_KEY, String(newState));
          logger.info(`[DevConsole] ${newState ? 'Opened' : 'Closed'}`);
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const open = () => {
    setIsOpen(true);
    localStorage.setItem(DEV_CONSOLE_STORAGE_KEY, 'true');
    logger.info('[DevConsole] Opened');
  };

  const close = () => {
    setIsOpen(false);
    localStorage.setItem(DEV_CONSOLE_STORAGE_KEY, 'false');
    logger.info('[DevConsole] Closed');
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

if (typeof window !== 'undefined') {
  (window as any).__openDevConsole = () => {
    localStorage.setItem(DEV_CONSOLE_STORAGE_KEY, 'true');
    window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'D' }));
  };

  logger.info('💡 Dev Console: Press Ctrl+Shift+D (or Cmd+Shift+D) to toggle');
  logger.info('💡 Or call window.__openDevConsole()');
}
