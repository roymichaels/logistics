export const breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
  xl: 1440,
};

export type Breakpoint = keyof typeof breakpoints;

export function getBreakpoint(width: number): Breakpoint {
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  if (width < breakpoints.desktop) return 'desktop';
  if (width < breakpoints.xl) return 'desktop';
  return 'xl';
}

export function isMobile(width: number) {
  return width < breakpoints.mobile;
}

export function isTablet(width: number) {
  return width >= breakpoints.mobile && width < breakpoints.tablet;
}

export function isDesktop(width: number) {
  return width >= breakpoints.tablet;
}
