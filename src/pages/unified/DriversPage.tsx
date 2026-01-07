import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DriverPersonalView } from '../../components/drivers/DriverPersonalView';
import { DriversManagementView } from '../../components/drivers/DriversManagementView';
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          אין גישה
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          אין לך הרשאה לצפות בדף זה
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #1D9BF0, #1A8CD8)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          חזור לדף הבית
        </button>
      </div>
    </div>
  );
}
