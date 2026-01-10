import { useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }

          logger.info('[KeyboardShortcuts] Triggered', {
            key: shortcut.key,
            description: shortcut.description,
          });

          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// Global keyboard shortcuts
export function useGlobalShortcuts(onNavigate: (path: string) => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'g',
      shift: true,
      description: 'Go to Dashboard',
      handler: () => onNavigate('/business/dashboard'),
    },
    {
      key: 'o',
      shift: true,
      description: 'Go to Orders',
      handler: () => onNavigate('/business/orders'),
    },
    {
      key: 'p',
      shift: true,
      description: 'Go to Products',
      handler: () => onNavigate('/business/products'),
    },
    {
      key: 'i',
      shift: true,
      description: 'Go to Inventory',
      handler: () => onNavigate('/business/inventory'),
    },
    {
      key: 'm',
      shift: true,
      description: 'Go to Messages',
      handler: () => onNavigate('/business/chat'),
    },
    {
      key: ',',
      meta: true,
      description: 'Open Settings',
      handler: () => onNavigate('/business/settings'),
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

// Focus management utilities
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}
