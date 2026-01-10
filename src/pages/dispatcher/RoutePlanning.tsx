import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundSelect } from '../../components/underground/UndergroundSelect';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';

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
      case 'high': return undergroundTheme.colors.status.error;
      case 'medium': return undergroundTheme.colors.status.warning;
      case 'low': return undergroundTheme.colors.status.info;
      default: return undergroundTheme.colors.text.tertiary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <h1 style={{
          fontSize: undergroundTheme.typography.fontSize['4xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: '0 0 8px 0',
          color: undergroundTheme.colors.text.primary,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          🗺️ Route Planning
        </h1>
        <p style={{
          margin: 0,
          color: undergroundTheme.colors.text.secondary,
          fontSize: undergroundTheme.typography.fontSize.lg
        }}>
          Plan and optimize delivery routes for drivers
        </p>
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          alignItems: 'end'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary,
              marginBottom: undergroundTheme.spacing.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold
            }}>
              Assign to Driver
            </label>
            <UndergroundSelect
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              {drivers.map((driver) => (
                <option key={driver.value} value={driver.value}>
                  {driver.label}
                </option>
              ))}
            </UndergroundSelect>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary,
              marginBottom: undergroundTheme.spacing.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold
            }}>
              Filter by Zone
            </label>
            <UndergroundSelect
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              {zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </UndergroundSelect>
          </div>
          <UndergroundButton
            variant="primary"
            fullWidth
            onClick={() => console.log('Optimize route')}
          >
            🎯 Optimize Route
          </UndergroundButton>
        </div>
      </UndergroundCard>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundCard>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing['2xl']
          }}>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              📦 Pending Deliveries
            </h2>
            <span style={{
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
              background: `${undergroundTheme.colors.status.warning}20`,
              color: undergroundTheme.colors.status.warning,
              borderRadius: undergroundTheme.borderRadius.lg,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              border: `1px solid ${undergroundTheme.colors.status.warning}40`
            }}>
              {pendingStops.length} stops
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {pendingStops.map((stop) => (
              <UndergroundCard
                key={stop.id}
                variant="light"
                hover
                onClick={() => console.log('Select stop:', stop.id)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: undergroundTheme.spacing.md
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      <span style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        {stop.orderNumber}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getPriorityIcon(stop.priority)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {stop.customerName}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary
                    }}>
                      📍 {stop.address}
                    </div>
                  </div>
                  <div style={{
                    padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
                    background: `${getPriorityColor(stop.priority)}20`,
                    color: getPriorityColor(stop.priority),
                    borderRadius: undergroundTheme.borderRadius.md,
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    border: `1px solid ${getPriorityColor(stop.priority)}40`
                  }}>
                    {stop.priority}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.tertiary
                  }}>
                    ETA: {stop.estimatedTime}
                  </span>
                  <UndergroundButton
                    variant="success"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Assign stop:', stop.id);
                    }}
                  >
                    Assign
                  </UndergroundButton>
                </div>
              </UndergroundCard>
            ))}
          </div>
        </UndergroundCard>

        <UndergroundCard>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing['2xl']
          }}>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              🚚 Assigned Routes
            </h2>
            <span style={{
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
              background: `${undergroundTheme.colors.status.info}20`,
              color: undergroundTheme.colors.status.info,
              borderRadius: undergroundTheme.borderRadius.lg,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              border: `1px solid ${undergroundTheme.colors.status.info}40`
            }}>
              {assignedStops.length} stops
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {assignedStops.map((stop, index) => (
              <UndergroundCard
                key={stop.id}
                variant="light"
                hover
                onClick={() => console.log('View stop details:', stop.id)}
              >
                <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: undergroundTheme.colors.gradient.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary,
                    flexShrink: 0,
                    boxShadow: undergroundTheme.shadows.glow.cyan
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: undergroundTheme.spacing.sm
                    }}>
                      <div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.text.tertiary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          {stop.orderNumber}
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.lg,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: undergroundTheme.colors.text.primary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          {stop.customerName}
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.secondary
                        }}>
                          📍 {stop.address}
                        </div>
                      </div>
                      <div style={getStatusBadgeStyle(stop.status)}>
                        {stop.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      ETA: {stop.estimatedTime}
                    </div>
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>
        </UndergroundCard>
      </div>
    </div>
  );
}
