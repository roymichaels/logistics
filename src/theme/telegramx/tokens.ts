import { txColors } from './colors';
import { txRadii } from './radii';
import { txShadows } from './shadows';
import { txMotion } from './motion';
import { txTypography } from './typography';

export const telegramXTokens = {
  colors: txColors,
  radius: txRadii,
  shadows: txShadows,
  motion: txMotion,
  typography: txTypography,
  spacing: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
  },
};

export function useTelegramXTheme() {
  return telegramXTokens;
}
