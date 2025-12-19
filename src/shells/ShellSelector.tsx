import React from 'react';
import { UserRole } from './types';
import { AdminShell } from './AdminShell';
import { BusinessShell } from './BusinessShell';
import { DriverShell } from './DriverShell';
import { StoreShell } from './StoreShell';

interface ShellSelectorProps {
  children: React.ReactNode;
  role: UserRole | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  metadata?: {
    businessName?: string;
    businessId?: string;
    driverName?: string;
    driverEarnings?: number;
    cartItemCount?: number;
  };
}

export function ShellSelector({
  children,
  role,
  onNavigate,
  onLogout,
  currentPath,
  metadata = {}
}: ShellSelectorProps) {
  // Route to appropriate shell based on role
  if (role === 'infrastructure_owner') {
    return (
      <AdminShell
        onNavigate={onNavigate}
        onLogout={onLogout}
        currentPath={currentPath}
      >
        {children}
      </AdminShell>
    );
  }

  if (
    role === 'business_owner' ||
    role === 'manager' ||
    role === 'warehouse' ||
    role === 'dispatcher' ||
    role === 'sales' ||
    role === 'customer_service'
  ) {
    return (
      <BusinessShell
        role={role}
        onNavigate={onNavigate}
        onLogout={onLogout}
        currentPath={currentPath}
        businessName={metadata.businessName}
        businessId={metadata.businessId}
      >
        {children}
      </BusinessShell>
    );
  }

  if (role === 'driver') {
    return (
      <DriverShell
        onNavigate={onNavigate}
        onLogout={onLogout}
        currentPath={currentPath}
        driverName={metadata.driverName}
        driverEarnings={metadata.driverEarnings}
      >
        {children}
      </DriverShell>
    );
  }

  // Default to StoreShell for customer, user, or no role
  return (
    <StoreShell
      onNavigate={onNavigate}
      onLogout={onLogout}
      currentPath={currentPath}
      isAuthenticated={role === 'customer'}
      cartItemCount={metadata.cartItemCount}
    >
      {children}
    </StoreShell>
  );
}
