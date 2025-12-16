import { appColors } from './colors';
import { appRadii } from './radii';
import { appShadows } from './shadows';
import { appMotion } from './motion';
import { appTypography } from './typography';

export const appTokens = {
  colors: appColors,
  radius: appRadii,
  shadows: appShadows,
  motion: appMotion,
  typography: appTypography,
  spacing: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
  },
};

export function useAppTheme() {
  return appTokens;
}
