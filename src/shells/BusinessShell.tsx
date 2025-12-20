import React from 'react';
import { BaseShell } from './BaseShell';
import { UserRole } from './types';

interface BusinessShellProps {
  children: React.ReactNode;
  role: UserRole;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  businessName?: string;
  businessId?: string;
}

function BusinessShellContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function BusinessShell({
  children,
  role,
  onNavigate,
  onLogout,
  currentPath,
  businessName,
  businessId
}: BusinessShellProps) {
  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={businessName || 'Business Portal'}
    >
      <BusinessShellContent>
        {children}
      </BusinessShellContent>
    </BaseShell>
  );
}
