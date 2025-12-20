import React from 'react';
import { BaseShell } from './BaseShell';

interface StoreShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  currentPath: string;
  isAuthenticated?: boolean;
  cartItemCount?: number;
}

function StoreShellContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function StoreShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  isAuthenticated,
  cartItemCount
}: StoreShellProps) {
  return (
    <BaseShell
      role={isAuthenticated ? 'customer' : 'user'}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout || (() => {})}
      title=""
    >
      <StoreShellContent>
        {children}
      </StoreShellContent>
    </BaseShell>
  );
}
