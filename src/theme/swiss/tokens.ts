export const swissRadii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const swissSpacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const swissShadows = {
  subtle: '0 4px 16px rgba(0,0,0,0.05)',
  soft: '0 10px 30px rgba(0,0,0,0.08)',
  glass: '0 20px 60px rgba(0,0,0,0.12)',
};

export const swissMotion = {
  fast: '160ms ease',
  medium: '220ms ease',
  slow: '320ms ease',
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export const swissGlass = {
  surface: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  blur: '12px',
};

export const swissColors = {
  background: '#0f1218',
  card: '#161b26',
  cardAlt: '#131722',
  text: '#e8ecf5',
  textMuted: '#9ba3b5',
  accent: '#1d9bf0',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

export type SwissTokens = typeof swissRadii &
  typeof swissSpacing &
  typeof swissShadows &
  typeof swissMotion &
  typeof swissGlass &
  typeof swissColors;

export const swissTokens = {
  radii: swissRadii,
  spacing: swissSpacing,
  shadows: swissShadows,
  motion: swissMotion,
  glass: swissGlass,
  colors: swissColors,
};

export function useSwissTokens() {
  return swissTokens;
}
