export const tokens = {
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    pill: '999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  colors: {
    bg: '#141821',
    panel: 'rgba(26, 31, 42, 0.9)',
    text: '#FFFFFF',
    subtle: 'rgba(208, 211, 219, 0.72)',
    primary: {
      50: '#F5F3FF',
      200: '#C4B5FD',
      700: '#6D28D9',
    } as Record<number, string> & string,
    secondary: '#A066FF',
    success: '#4ADE80',
    danger: '#F87171',
    border: 'rgba(255,255,255,0.08)',
    semantic: {
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
    },
    neutral: {
      100: '#F5F5F5',
      300: '#D4D4D8',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
    } as Record<number, string>,
  },
  typography: {
    font: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    size: {
      sm: '14px',
      md: '16px',
      lg: '20px',
    },
    weight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  shadows: {
    sm: '0 2px 6px rgba(0,0,0,0.25)',
    md: '0 4px 12px rgba(0,0,0,0.30)',
    lg: '0 8px 24px rgba(0,0,0,0.35)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
  },
};

export function useTheme() {
  return tokens;
}
