import React from 'react';
import { BaseShell } from './BaseShell';

interface DriverShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  driverName?: string;
  driverEarnings?: number;
}

function DriverShellContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DriverShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  driverName,
  driverEarnings
}: DriverShellProps) {
  return (
    <BaseShell
      role="driver"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Driver Dashboard"
    >
      <DriverShellContent>
        {children}
      </DriverShellContent>
    </BaseShell>
  );
}
