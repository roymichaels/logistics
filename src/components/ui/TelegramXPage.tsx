import React from 'react';
import { createTelegramPadding } from '../../utils/layout';
import { telegramXTokens } from '../../theme/telegramx/tokens';

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const TelegramXPage: React.FC<Props> = ({ children, style }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: telegramXTokens.colors.background,
        color: telegramXTokens.colors.text,
        ...createTelegramPadding(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
