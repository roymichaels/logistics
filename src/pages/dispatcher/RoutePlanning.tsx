import React, { useState } from 'react';
import { getStatusBadgeStyle, tokens } from '../../styles/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ContentCard } from '../../components/layout/ContentCard';

interface DeliveryStop {
  id: string;
  orderNumber: string;
  address: string;
  customerName: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
}

export function RoutePlanning() {
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');

  const drivers = [
    { value: '', label: 'Select a driver' },
    { value: 'driver-1', label: 'John Driver' },
    { value: 'driver-2', label: 'Jane Courier' },
    { value: 'driver-3', label: 'Bob Delivery' },
  ];

  const zones = [
    { value: 'all', label: 'All Zones' },
    { value: 'north', label: 'North Zone' },
    { value: 'south', label: 'South Zone' },
    { value: 'east', label: 'East Zone' },
    { value: 'west', label: 'West Zone' },
  ];

  const pendingStops: DeliveryStop[] = [
    { id: '1', orderNumber: 'ORD-1234', address: '123 Main St', customerName: 'Alice Johnson', priority: 'high', estimatedTime: '15 min', status: 'pending' },
    { id: '2', orderNumber: 'ORD-1235', address: '456 Oak Ave', customerName: 'Bob Smith', priority: 'medium', estimatedTime: '20 min', status: 'pending' },
    { id: '3', orderNumber: 'ORD-1236', address: '789 Pine Rd', customerName: 'Carol White', priority: 'low', estimatedTime: '25 min', status: 'pending' },
  ];

  const assignedStops: DeliveryStop[] = [
    { id: '4', orderNumber: 'ORD-1230', address: '321 Elm St', customerName: 'David Brown', priority: 'high', estimatedTime: '10 min', status: 'in_progress' },
    { id: '5', orderNumber: 'ORD-1231', address: '654 Maple Dr', customerName: 'Eve Davis', priority: 'medium', estimatedTime: '15 min', status: 'assigned' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return tokens.colors.status.error;
      case 'medium': return tokens.colors.status.warning;
      case 'low': return tokens.colors.status.info;
      default: return tokens.colors.text.secondary;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        icon="🗺️"
        title="Route Planning"
        subtitle="Plan and optimize delivery routes for drivers"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: 500 }}>
            Assign to Driver
          </label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            style={styles.input}
          >
            {drivers.map((driver) => (
              <option key={driver.value} value={driver.value}>
                {driver.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: 500 }}>
            Filter by Zone
          </label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={styles.input}
          >
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => console.log('Optimize route')}
            style={{
              ...styles.button.primary,
              width: '100%'
            }}
          >
            Optimize Route
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        <ContentCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.cardTitle}>Pending Deliveries</h2>
            <span
              style={{
                padding: '6px 12px',
                background: tokens.colors.status.warning + '20',
                color: tokens.colors.status.warning,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {pendingStops.length} stops
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingStops.map((stop) => (
              <ContentCard
                key={stop.id}
                hoverable
                onClick={() => console.log('Select stop:', stop.id)}
                style={{ padding: '16px', marginBottom: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                      {stop.orderNumber}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.text.primary, marginBottom: '4px' }}>
                      {stop.customerName}
                    </div>
                    <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                      📍 {stop.address}
                    </div>
                  </div>
                  <span
                    style={{
                      ...styles.badge.base,
                      backgroundColor: getPriorityColor(stop.priority) + '20',
                      color: getPriorityColor(stop.priority),
                      border: `1px solid ${getPriorityColor(stop.priority)}40`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {stop.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                    ETA: {stop.estimatedTime}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Assign stop:', stop.id);
                    }}
                    style={{
                      ...styles.button.success,
                      padding: '6px 12px',
                      fontSize: '12px'
                    }}
                  >
                    Assign
                  </button>
                </div>
              </ContentCard>
            ))}
          </div>

          {pendingStops.length === 0 && (
            <div style={styles.emptyState.container}>
              <div style={styles.emptyState.containerIcon}>📦</div>
              <p style={styles.emptyState.containerText}>
                No pending deliveries at the moment.
              </p>
            </div>
          )}
        </ContentCard>

        <ContentCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.cardTitle}>Assigned Routes</h2>
            <span
              style={{
                padding: '6px 12px',
                background: tokens.colors.status.info + '20',
                color: tokens.colors.status.info,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {assignedStops.length} stops
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignedStops.map((stop, index) => (
              <ContentCard
                key={stop.id}
                hoverable
                onClick={() => console.log('View stop details:', stop.id)}
                style={{ padding: '16px', marginBottom: 0 }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: tokens.gradients.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: tokens.colors.text.bright,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                          {stop.orderNumber}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.text.primary, marginBottom: '4px' }}>
                          {stop.customerName}
                        </div>
                        <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                          📍 {stop.address}
                        </div>
                      </div>
                      <span style={getStatusBadgeStyle(stop.status)}>
                        {stop.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                      ETA: {stop.estimatedTime}
                    </div>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>

          {assignedStops.length === 0 && (
            <div style={styles.emptyState.container}>
              <div style={styles.emptyState.containerIcon}>🚚</div>
              <p style={styles.emptyState.containerText}>
                No assigned routes yet. Start assigning deliveries.
              </p>
            </div>
          )}
        </ContentCard>
      </div>
    </PageContainer>
  );
}
