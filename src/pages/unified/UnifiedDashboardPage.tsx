import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { BusinessOwnerDashboard } from '../business/BusinessOwnerDashboard';
import { WarehouseDashboard } from '../WarehouseDashboard';
import { DispatchBoard } from '../DispatchBoard';
import { SalesDashboard } from '../sales/SalesDashboard';
import { SupportConsole } from '../customer-service/SupportConsole';
import { UnifiedDriverDashboard } from '../driver/UnifiedDriverDashboard';
import { PlatformDashboard } from '../admin/PlatformDashboard';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';

interface UnifiedDashboardPageProps {
  businessId?: string;
  role?: string;
}

export function UnifiedDashboardPage({ businessId, role: propsRole }: UnifiedDashboardPageProps) {
  const { user, profile } = useAuth();
  const appServices = useSafeAppServices();
  const dataStore = appServices?.dataStore ?? null;
  const navigate = useNavigate();

  const role = propsRole || profile?.role || appServices?.userRole || 'guest';
  const userId = user?.id;

  logger.info('[UnifiedDashboardPage] Rendering with role:', role, 'businessId:', businessId);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  if (role === 'superadmin' || role === 'admin' || role === 'infrastructure_owner') {
    return <PlatformDashboard />;
  }

  if (role === 'business_owner') {
    return <BusinessOwnerDashboard />;
  }

  if (role === 'manager') {
    return <Dashboard />;
  }

  if (role === 'warehouse') {
    return <WarehouseDashboard dataStore={dataStore} onNavigate={handleNavigate} />;
  }

  if (role === 'dispatcher') {
    return <DispatchBoard dataStore={dataStore} />;
  }

  if (role === 'sales') {
    return <SalesDashboard />;
  }

  if (role === 'customer_service') {
    return <SupportConsole />;
  }

  if (role === 'driver') {
    return <UnifiedDriverDashboard />;
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
          אין לך הרשאה לצפות בלוח הבקרה
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
