import { logger } from '../lib/logger';

export interface AriaAttributes {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-selected'?: boolean;
  'aria-pressed'?: boolean;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  'aria-busy'?: boolean;
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);

  logger.info('[Accessibility] Screen reader announcement', { message, priority });
}

export function setFocusToElement(elementId: string, delay = 0) {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      logger.info('[Accessibility] Focus set to element', { elementId });
    } else {
      logger.warn('[Accessibility] Element not found for focus', { elementId });
    }
  }, delay);
}

export function trapFocus(containerElement: HTMLElement) {
  const focusableElements = containerElement.querySelectorAll<HTMLElement>(
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

  containerElement.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    containerElement.removeEventListener('keydown', handleKeyDown);
  };
}

export function getAriaLabel(
  label: string,
  description?: string,
  count?: number
): AriaAttributes {
  let ariaLabel = label;

  if (count !== undefined) {
    ariaLabel += `, ${count} items`;
  }

  if (description) {
    ariaLabel += `. ${description}`;
  }

  return {
    'aria-label': ariaLabel,
  };
}

export function getButtonAriaAttributes(
  label: string,
  options: {
    pressed?: boolean;
    expanded?: boolean;
    disabled?: boolean;
    description?: string;
  } = {}
): AriaAttributes {
  const attrs: AriaAttributes = {
    'aria-label': label,
  };

  if (options.pressed !== undefined) {
    attrs['aria-pressed'] = options.pressed;
  }

  if (options.expanded !== undefined) {
    attrs['aria-expanded'] = options.expanded;
  }

  if (options.disabled) {
    attrs['aria-disabled'] = true;
  }

  if (options.description) {
    attrs['aria-describedby'] = `desc-${label.replace(/\s+/g, '-').toLowerCase()}`;
  }

  return attrs;
}

export function getNavigationAriaAttributes(
  currentPath: string,
  itemPath: string,
  label: string
): AriaAttributes {
  return {
    'aria-label': label,
    'aria-current': currentPath === itemPath ? 'page' : undefined,
  };
}

export function getLiveRegionAttributes(
  type: 'status' | 'alert' | 'log' = 'status'
): AriaAttributes {
  const priorities: Record<string, 'polite' | 'assertive'> = {
    status: 'polite',
    alert: 'assertive',
    log: 'polite',
  };

  return {
    role: type,
    'aria-live': priorities[type],
    'aria-atomic': true,
  };
}

export function checkColorContrast(
  foreground: string,
  background: string,
  requireLargeText = false
): { ratio: number; passes: boolean; level: 'AAA' | 'AA' | 'Fail' } {
  const getLuminance = (hex: string) => {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)
      ?.map(x => parseInt(x, 16) / 255) || [0, 0, 0];

    const [r, g, b] = rgb.map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  const minRatioAA = requireLargeText ? 3 : 4.5;
  const minRatioAAA = requireLargeText ? 4.5 : 7;

  let level: 'AAA' | 'AA' | 'Fail' = 'Fail';
  if (ratio >= minRatioAAA) {
    level = 'AAA';
  } else if (ratio >= minRatioAA) {
    level = 'AA';
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= minRatioAA,
    level,
  };
}

export function getKeyboardNavigationHelpers() {
  return {
    isNavigationKey: (key: string) => {
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key);
    },

    isActivationKey: (key: string) => {
      return key === 'Enter' || key === ' ';
    },

    isEscapeKey: (key: string) => {
      return key === 'Escape';
    },

    preventDefault: (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

export function createSkipLink(targetId: string, label = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return skipLink;
}

export function addAccessibleStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Screen reader only content */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Focus visible styles */
    *:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }

    /* Remove default focus for mouse users */
    *:focus:not(:focus-visible) {
      outline: none;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      * {
        border-color: currentColor !important;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Skip link styles */
    .skip-link:focus {
      position: absolute;
      top: 0 !important;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      z-index: 9999;
    }
  `;

  document.head.appendChild(style);
  logger.info('[Accessibility] Accessible styles added');
}

// Initialize accessibility features
export function initAccessibility() {
  addAccessibleStyles();

  // Add skip link if main content exists
  const mainContent = document.querySelector('main');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }

  if (mainContent?.id) {
    const skipLink = createSkipLink(mainContent.id);
    document.body.prepend(skipLink);
  }

  logger.info('[Accessibility] Accessibility features initialized');
}
