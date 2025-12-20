import React from 'react';
import { BaseShell } from './BaseShell';

interface AdminShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  username?: string;
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function AdminShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  username
}: AdminShellProps) {
  return (
    <BaseShell
      role="infrastructure_owner"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Infrastructure Admin"
    >
      <AdminShellContent>
        {children}
      </AdminShellContent>
    </BaseShell>
  );
}
