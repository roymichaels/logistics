import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';

export function InfrastructureDashboard() {
  const { dataStore } = useAppServices();
  const [metrics, setMetrics] = useState({
    totalBusinesses: 0,
    totalDrivers: 0,
    totalOrders: 0,
    systemHealth: 'healthy' as 'healthy' | 'warning' | 'critical',
  });

  useEffect(() => {
    loadMetrics();
  }, [dataStore]);

  const loadMetrics = async () => {
    if (!dataStore) return;

    try {
      const orders = await dataStore.listOrders?.();

      setMetrics({
        totalBusinesses: 3,
        totalDrivers: 5,
        totalOrders: orders?.length || 0,
        systemHealth: 'healthy',
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

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
