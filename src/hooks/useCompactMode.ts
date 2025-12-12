import React from 'react';
import { getBreakpoint } from '../theme/breakpoints';

type Options = {
  forced?: boolean;
};

/**
 * Compact mode helper. Non-breaking and UI-only.
 * Activates automatically on small viewports or when forced.
 */
export function useCompactMode(options: Options = {}) {
  const { forced = false } = options;
  const [isCompact, setIsCompact] = React.useState(false);

  React.useEffect(() => {
    if (forced) {
      setIsCompact(true);
      return;
    }
    const update = () => {
      const bp = getBreakpoint(window.innerWidth);
      setIsCompact(bp === 'mobile' || bp === 'tablet');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [forced]);

  return { isCompact, setIsCompact };
}

export default useCompactMode;
