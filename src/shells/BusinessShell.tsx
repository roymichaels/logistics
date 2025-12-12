import React from 'react';
import { telegramXTokens } from '../theme/telegramx/tokens';
import { AppContainer } from './layout/AppContainer';
import { PageContainer } from './layout/PageContainer';
import { migrationFlags } from '../migration/flags';

type ShellSlots = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
};

type Props = ShellSlots & {
  children: React.ReactNode;
};

const ENABLE_TELEGRAMX_UI = true;

export function BusinessShell({ header, sidebar, actions, children }: Props) {
  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }

  const headerNode = header ? (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>{header}</div>
  ) : null;
  const actionsNode = actions ? (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>{actions}</div>
  ) : null;

  if (!ENABLE_TELEGRAMX_UI) {
    return (
      <AppContainer>
        <PageContainer>
          {headerNode}
          {sidebar}
          {actionsNode}
          <div>{children}</div>
        </PageContainer>
      </AppContainer>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: telegramXTokens.colors.background, color: telegramXTokens.colors.text, transition: telegramXTokens.motion.base }}>
      <AppContainer>
        <PageContainer>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: telegramXTokens.spacing.md,
              width: '100%',
            }}
          >
            <div>{sidebar}</div>
            <div style={{ minWidth: 0 }}>
              {headerNode}
              {actionsNode}
              <div>{children}</div>
            </div>
          </div>
        </PageContainer>
      </AppContainer>
    </div>
  );
}
