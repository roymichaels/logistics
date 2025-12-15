import React, { useState } from 'react';
import { DriverDashboardPage } from './DriverDashboardPage';
import { DeliveryRoutesPage } from './DeliveryRoutesPage';
import { OrderMarketplacePage } from './OrderMarketplacePage';
import { DeliveryHistoryPage } from './DeliveryHistoryPage';
import { DriverProfilePage } from './DriverProfilePage';

interface DriverDemoPageProps {
  dataStore: any;
}

type View = 'dashboard' | 'routes' | 'marketplace' | 'history' | 'profile';

export function DriverDemoPage({ dataStore }: DriverDemoPageProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const handleNavigate = (path: string) => {
    if (path.includes('dashboard')) {
      setCurrentView('dashboard');
    } else if (path.includes('routes')) {
      setCurrentView('routes');
    } else if (path.includes('marketplace')) {
      setCurrentView('marketplace');
    } else if (path.includes('history')) {
      setCurrentView('history');
    } else if (path.includes('profile')) {
      setCurrentView('profile');
    }
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
            backgroundColor: currentView === 'dashboard' ? '#10b981' : 'white',
            color: currentView === 'dashboard' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('marketplace')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'marketplace' ? '#10b981' : 'white',
            color: currentView === 'marketplace' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Find Orders
        </button>
        <button
          onClick={() => setCurrentView('routes')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'routes' ? '#10b981' : 'white',
            color: currentView === 'routes' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Routes
        </button>
        <button
          onClick={() => setCurrentView('history')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'history' ? '#10b981' : 'white',
            color: currentView === 'history' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          History
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentView === 'profile' ? '#10b981' : 'white',
            color: currentView === 'profile' ? 'white' : '#1f2937',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Profile
        </button>
        <div
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            color: '#6b7280',
            whiteSpace: 'nowrap',
          }}
        >
          MEGA WAVE 5 - Phase 4 Demo
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {currentView === 'dashboard' && (
          <DriverDashboardPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'routes' && (
          <DeliveryRoutesPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'marketplace' && (
          <OrderMarketplacePage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'history' && (
          <DeliveryHistoryPage dataStore={dataStore} onNavigate={handleNavigate} />
        )}

        {currentView === 'profile' && (
          <DriverProfilePage dataStore={dataStore} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
}
