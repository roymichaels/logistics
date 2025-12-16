import React from 'react';
import { createStandardPadding } from '../../utils/layout';
import { appTokens } from '../../theme/app/tokens';

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const AppPage: React.FC<Props> = ({ children, style }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: appTokens.colors.background,
        color: appTokens.colors.text,
        ...createStandardPadding(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Legacy export for compatibility
export const TelegramXPage = AppPage;
