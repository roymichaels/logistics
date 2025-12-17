import React, { useState } from 'react';
import { colors, spacing } from '../../design-system';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Select } from '../../components/molecules/Select';

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
      case 'high': return colors.status.error;
      case 'medium': return colors.status.warning;
      case 'low': return colors.status.info;
      default: return colors.text.tertiary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.status.success;
      case 'in_progress': return colors.status.info;
      case 'assigned': return colors.status.warning;
      case 'pending': return colors.text.tertiary;
      default: return colors.text.tertiary;
    }
  };

  return (
    <div style={{ padding: spacing[4] }}>
      <div style={{ marginBottom: spacing[4] }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
          Route Planning
        </h1>
        <p style={{ fontSize: '14px', color: colors.text.secondary }}>
          Plan and optimize delivery routes for drivers
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[3], marginBottom: spacing[4] }}>
        <Select
          value={selectedDriver}
          onChange={setSelectedDriver}
          options={drivers}
          label="Assign to Driver"
        />
        <Select
          value={selectedZone}
          onChange={setSelectedZone}
          options={zones}
          label="Filter by Zone"
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button variant="primary" style={{ width: '100%' }}>
            Optimize Route
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: spacing[4] }}>
        <Card padding={spacing[4]}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.text.primary }}>
              Pending Deliveries
            </h2>
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text.tertiary }}>
              {pendingStops.length} stops
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {pendingStops.map((stop) => (
              <div
                key={stop.id}
                style={{
                  padding: spacing[3],
                  backgroundColor: colors.background.secondary,
                  borderRadius: '6px',
                  border: `1px solid ${colors.border.primary}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[1] }}>
                      {stop.orderNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.text.secondary }}>
                      {stop.customerName}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: `${spacing[1]} ${spacing[2]}`,
                      backgroundColor: getPriorityColor(stop.priority) + '20',
                      color: getPriorityColor(stop.priority),
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {stop.priority}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: colors.text.primary, marginBottom: spacing[2] }}>
                  📍 {stop.address}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    Est. {stop.estimatedTime}
                  </span>
                  <Button variant="secondary" size="sm">
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={spacing[4]}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.text.primary }}>
              Current Route
            </h2>
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text.tertiary }}>
              {assignedStops.length} stops
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {assignedStops.map((stop, index) => (
              <div
                key={stop.id}
                style={{
                  padding: spacing[3],
                  backgroundColor: colors.background.secondary,
                  borderRadius: '6px',
                  border: `2px solid ${getStatusColor(stop.status)}`,
                }}
              >
                <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2] }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: colors.brand.primary,
                      color: colors.background.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[1] }}>
                      {stop.orderNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing[1] }}>
                      {stop.customerName}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.text.primary }}>
                      📍 {stop.address}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: getStatusColor(stop.status),
                      textTransform: 'uppercase',
                    }}
                  >
                    {stop.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    Est. {stop.estimatedTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
