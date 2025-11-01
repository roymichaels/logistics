/**
 * Utility functions for adding passive event listeners to improve performance
 * and prevent scroll blocking violations.
 */

type PassiveEventType = 'wheel' | 'touchstart' | 'touchmove' | 'scroll';

/**
 * Add an event listener with the passive flag set to true
 * to improve scroll performance and prevent blocking
 */
export function addPassiveEventListener<K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement,
  type: K,
  listener: (this: typeof target, ev: WindowEventMap[K]) => any,
  useCapture?: boolean
): () => void {
  const options: AddEventListenerOptions = {
    passive: true,
    capture: useCapture || false
  };

  target.addEventListener(type as string, listener as EventListener, options);

  return () => {
    target.removeEventListener(type as string, listener as EventListener, options);
  };
}

/**
 * Add a non-passive event listener (when you need preventDefault)
 */
export function addActiveEventListener<K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement,
  type: K,
  listener: (this: typeof target, ev: WindowEventMap[K]) => any,
  useCapture?: boolean
): () => void {
  const options: AddEventListenerOptions = {
    passive: false,
    capture: useCapture || false
  };

  target.addEventListener(type as string, listener as EventListener, options);

  return () => {
    target.removeEventListener(type as string, listener as EventListener, options);
  };
}

/**
 * Check if passive event listeners are supported
 */
let passiveSupported: boolean | null = null;

export function isPassiveSupported(): boolean {
  if (passiveSupported !== null) {
    return passiveSupported;
  }

  try {
    const options = {
      get passive() {
        passiveSupported = true;
        return false;
      }
    };

    const noop = () => {};
    window.addEventListener('test', noop, options);
    window.removeEventListener('test', noop);
  } catch (err) {
    passiveSupported = false;
  }

  return passiveSupported || false;
}
