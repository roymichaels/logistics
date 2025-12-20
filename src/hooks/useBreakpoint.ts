import { useState, useEffect } from 'react';
import { breakpoints } from '../styles/design-system/tokens';

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface BreakpointState {
  current: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  width: number;
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return {
        current: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        width: 1024,
      };
    }

    return getBreakpointState(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setState(getBreakpointState(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

function getBreakpointState(width: number): BreakpointState {
  const mobile = parseInt(breakpoints.mobile);
  const tablet = parseInt(breakpoints.tablet);
  const desktop = parseInt(breakpoints.desktop);
  const wide = parseInt(breakpoints.wide);

  let current: Breakpoint = 'mobile';
  if (width >= wide) current = 'wide';
  else if (width >= desktop) current = 'desktop';
  else if (width >= tablet) current = 'tablet';

  return {
    current,
    isMobile: width < tablet,
    isTablet: width >= tablet && width < desktop,
    isDesktop: width >= desktop && width < wide,
    isWide: width >= wide,
    width,
  };
}
