export * from './tokens';
export * from './utils';
import './variables.css';

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  iconSizes,
  backdropBlur,
  gradients,
  navigation
} from './tokens';

export const tokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  iconSizes,
  backdropBlur,
  gradients,
  navigation,
} as const;

export type DesignTokens = typeof tokens;

export { colors, spacing, typography, borderRadius, shadows, transitions, zIndex, breakpoints, iconSizes, backdropBlur, gradients, navigation };
