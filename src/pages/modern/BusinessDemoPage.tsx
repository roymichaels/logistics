import React, { useState } from 'react';
import { BusinessDashboardPage } from './BusinessDashboardPage';
import { ProductManagementPage } from './ProductManagementPage';
import { OrderManagementPage } from './OrderManagementPage';
import { AnalyticsPage } from './AnalyticsPage';
import { DriverManagementPage } from './DriverManagementPage';
import type { Order } from '@/data/types';

interface BusinessDemoPageProps {
  dataStore: any;
}

type View = 'dashboard' | 'products' | 'orders' | 'analytics' | 'drivers';

export function BusinessDemoPage({ dataStore }: BusinessDemoPageProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleNavigate = (path: string) => {
    if (path.includes('dashboard')) {
      setCurrentView('dashboard');
    } else if (path.includes('products')) {
      setCurrentView('products');
    } else if (path.includes('orders')) {
      setCurrentView('orders');
    } else if (path.includes('reports') || path.includes('analytics')) {
      setCurrentView('analytics');
    } else if (path.includes('drivers')) {
      setCurrentView('drivers');
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    console.log('Order clicked:', order);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setCurrentView('dashboard')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'dashboard' ? '#3b82f6' : 'white',
            color: currentView === 'dashboard' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('products')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'products' ? '#3b82f6' : 'white',
            color: currentView === 'products' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Products
        </button>
        <button
          onClick={() => setCurrentView('orders')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'orders' ? '#3b82f6' : 'white',
            color: currentView === 'orders' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Orders
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'analytics' ? '#3b82f6' : 'white',
            color: currentView === 'analytics' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Analytics
        </button>
        <button
          onClick={() => setCurrentView('drivers')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'drivers' ? '#3b82f6' : 'white',
            color: currentView === 'drivers' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Drivers
        </button>
        <div
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            color: '#6b7280',
            whiteSpace: 'nowrap',
          }}
        >
          MEGA WAVE 5 - Phase 3 Demo
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {currentView === 'dashboard' && (
          <BusinessDashboardPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'products' && (
          <ProductManagementPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'orders' && (
          <OrderManagementPage
            dataStore={dataStore}
            onNavigate={handleNavigate}
            onOrderClick={handleOrderClick}
          />
        )}

        {currentView === 'analytics' && <AnalyticsPage dataStore={dataStore} />}

        {currentView === 'drivers' && (
          <DriverManagementPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
}
