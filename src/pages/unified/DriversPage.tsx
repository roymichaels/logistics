import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DriverPersonalView } from '../../components/drivers/DriverPersonalView';
import { DriversManagementView } from '../../components/drivers/DriversManagementView';
import { UndergroundEmptyState } from '../../components/underground';
import { logger } from '../../lib/logger';

interface DriversPageProps {
  businessId?: string;
  role?: string;
}

export function DriversPage({ businessId, role: propsRole }: DriversPageProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const role = propsRole || profile?.role || 'guest';
  const userId = user?.id;

  logger.info('[DriversPage] Rendering with role:', role, 'businessId:', businessId);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  if (role === 'driver') {
    return <DriverPersonalView />;
  }

  if (
    role === 'business_owner' ||
    role === 'manager' ||
    role === 'dispatcher' ||
    role === 'superadmin' ||
    role === 'admin'
  ) {
    return (
      <DriversManagementView
        businessId={businessId}
        role={role}
        userId={userId}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <UndergroundEmptyState
      icon="🚫"
      title="אין גישה"
      description="אין לך הרשאה לצפות בדף זה"
      action={{
        label: 'חזור לדף הבית',
        onClick: () => navigate('/')
      }}
    />
  );
}
