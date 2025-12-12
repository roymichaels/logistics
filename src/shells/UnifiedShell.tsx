import React from 'react';
import { AppContainer } from './layout/AppContainer';
import { PageContainer } from './layout/PageContainer';
import { NavHeader } from '../components/navigation/NavHeader';

type UnifiedShellProps = {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
};

export function UnifiedShell({ children, title, actions, showBackButton, onBack }: UnifiedShellProps) {
  return (
    <AppContainer>
      <NavHeader title={title} actions={actions} showBackButton={showBackButton} onBack={onBack} />
      <PageContainer>
        {children}
      </PageContainer>
    </AppContainer>
  );
}
