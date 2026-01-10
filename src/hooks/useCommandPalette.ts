import { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    logger.info('[CommandPalette] Opening');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    logger.info('[CommandPalette] Closing');
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }

      // Cmd+/ (Mac) or Ctrl+/ (Windows/Linux) - alternative shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
