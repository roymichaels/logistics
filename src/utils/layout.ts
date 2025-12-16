import { appTokens } from '../theme/app/tokens';

export function createStandardPadding() {
  return {
    padding: '8px 10px',
  };
}

export function createCardPadding() {
  return {
    padding: `${appTokens.spacing.sm} ${appTokens.spacing.md}`,
  };
}

export function createFloatingActionButtonPosition(bottom: string = '24px', right: string = '24px') {
  return {
    position: 'fixed' as const,
    bottom,
    right,
    zIndex: 30,
  };
}
