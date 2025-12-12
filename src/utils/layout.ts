import { telegramXTokens } from '../theme/telegramx/tokens';

export function createTelegramPadding() {
  return {
    padding: '8px 10px',
  };
}

export function createTwitterCardPadding() {
  return {
    padding: `${telegramXTokens.spacing.sm} ${telegramXTokens.spacing.md}`,
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
