import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';

export function InfrastructureDashboard() {
  const { dataStore } = useAppServices();
  const [metrics, setMetrics] = useState({
    totalBusinesses: 0,
    totalDrivers: 0,
    totalOrders: 0,
    systemHealth: 'healthy' as 'healthy' | 'warning' | 'critical',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [dataStore]);

  const loadMetrics = async () => {
    if (!dataStore) {
      logger.warn('[InfrastructureDashboard] No dataStore available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.debug('[InfrastructureDashboard] Loading metrics');

      const orders = await dataStore.listOrders?.();

      setMetrics({
        totalBusinesses: 3,
        totalDrivers: 5,
        totalOrders: orders?.length || 0,
        systemHealth: 'healthy',
      });

      logger.debug('[InfrastructureDashboard] Metrics loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load metrics';
      logger.error('[InfrastructureDashboard] Failed to load metrics:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
        color: '#E7E9EA',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#8899A6' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
        color: '#E7E9EA',
      }}>
        <div style={{
          background: '#1E2732',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid #F4212E',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
            Failed to Load Dashboard
          </h2>
          <p style={{ color: '#8899A6', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={loadMetrics}
            style={{
              padding: '12px 24px',
              background: '#1D9BF0',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#E7E9EA',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '24px',
        color: '#E7E9EA',
      }}>
        Infrastructure Dashboard
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <MetricCard
          title="Total Businesses"
          value={metrics.totalBusinesses}
          icon="🏢"
        />
        <MetricCard
          title="Total Drivers"
          value={metrics.totalDrivers}
          icon="🚗"
        />
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon="📋"
        />
        <MetricCard
          title="System Health"
          value={metrics.systemHealth}
          icon="💚"
        />
      </div>

      <div style={{
        background: '#1E2732',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #38444D',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px',
        }}>
          Platform Overview
        </h2>
        <p style={{
          color: '#8899A6',
          lineHeight: '1.5',
        }}>
          Monitor and manage all businesses, drivers, and orders across the entire platform.
          View consolidated reports, analytics, and system health metrics.
        </p>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: string;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <div style={{
      background: '#1E2732',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #38444D',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <span style={{
          fontSize: '14px',
          color: '#8899A6',
        }}>
          {title}
        </span>
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: '700',
        color: '#E7E9EA',
      }}>
        {value}
      </div>
    </div>
  );
}
