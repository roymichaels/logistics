export const tokens = {
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    pill: '999px',
  },
  spacing: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
  },
  colors: {
    bg: '#0b1422',
    panel: 'rgba(14, 20, 35, 0.9)',
    text: '#e7e9ea',
    subtle: 'rgba(231, 233, 234, 0.72)',
    primary: '#1d9bf0',
    secondary: '#00b7ff',
    success: '#22c55e',
    danger: '#ef4444',
    border: 'rgba(255,255,255,0.08)',
  },
  typography: {
    font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    size: {
      sm: '13px',
      md: '15px',
      lg: '17px',
    },
    weight: {
      regular: 500,
      medium: 600,
      bold: 700,
    },
  },
  shadows: {
    sm: '0 8px 18px rgba(0,0,0,0.25)',
    md: '0 12px 26px rgba(0,0,0,0.35)',
    lg: '0 18px 40px rgba(0,0,0,0.45)',
  },
  transitions: {
    fast: '150ms ease',
    base: '220ms ease',
  },
};

export function useTheme() {
  return tokens;
}
