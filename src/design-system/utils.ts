import { colors, spacing, typography, borderRadius, shadows, transitions } from './tokens';

export function color(path: string): string {
  const keys = path.split('.');
  let value: any = colors;
  for (const key of keys) {
    value = value[key];
    if (value === undefined) return '';
  }
  return value;
}

export function space(value: keyof typeof spacing): string {
  return spacing[value];
}

export function fontSize(size: keyof typeof typography.fontSize): string {
  return typography.fontSize[size];
}

export function fontWeight(weight: keyof typeof typography.fontWeight): string {
  return typography.fontWeight[weight];
}

export function radius(size: keyof typeof borderRadius): string {
  return borderRadius[size];
}

export function shadow(size: keyof typeof shadows): string {
  return shadows[size];
}

export function transition(speed: keyof typeof transitions): string {
  return transitions[speed];
}

export function responsive(breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide'): string {
  const bp = { mobile: 480, tablet: 768, desktop: 1024, wide: 1280 };
  return `@media (min-width: ${bp[breakpoint]}px)`;
}

export const css = {
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  visuallyHidden: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  },
};
