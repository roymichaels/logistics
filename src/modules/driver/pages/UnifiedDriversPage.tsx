import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../../lib/logger';
import {
  Driver,
  DriverStatus,
  DriverFilters
} from '../types';
import {
  useDriverMutations,
  useDriverFilters,
  useDriverStats
} from '../hooks';

interface UnifiedDriversPageProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

export function UnifiedDriversPage({
  businessId,
  role,
  userId,
  onNavigate
}: UnifiedDriversPageProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const { filteredDrivers, filters, setFilters } = useDriverFilters(drivers);

  const {
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    updateDriverAvailability,
    isLoading: mutating
  } = useDriverMutations();

  useEffect(() => {
    loadDrivers();
  }, [businessId]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const storedDrivers: Driver[] = JSON.parse(localStorage.getItem('drivers') || '[]');

      let filtered = storedDrivers;

      if (businessId) {
        filtered = filtered.filter(d => d.business_id === businessId);
      }

      setDrivers(filtered);
      logger.info('Drivers loaded:', filtered.length);
    } catch (error) {
      logger.error('Failed to load drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const displayedDrivers = useMemo(() => {
    let result = filteredDrivers;

    if (selectedStatus && selectedStatus !== 'all') {
      result = result.filter(d => d.status === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.user_id.toLowerCase().includes(term) ||
        d.phone?.toLowerCase().includes(term) ||
        d.vehicle_plate?.toLowerCase().includes(term) ||
        d.vehicle_type?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [filteredDrivers, selectedStatus, searchTerm]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const available = drivers.filter(d => d.status === 'available').length;
    const busy = drivers.filter(d => d.status === 'busy').length;
    const offline = drivers.filter(d => d.status === 'offline').length;
    const onBreak = drivers.filter(d => d.status === 'on_break').length;
    const avgRating = drivers.length > 0
      ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
      : 0;
    const totalDeliveries = drivers.reduce((sum, d) => sum + (d.total_deliveries || 0), 0);

    return {
      total,
      available,
      busy,
      offline,
      onBreak,
      avgRating,
      totalDeliveries
    };
  }, [drivers]);

  const handleStatusChange = async (driverId: string, status: DriverStatus) => {
    try {
      await updateDriverStatus(driverId, status);
      await loadDrivers();
    } catch (error) {
      logger.error('Failed to update driver status:', error);
    }
  };

  const handleAvailabilityToggle = async (driverId: string, isAvailable: boolean) => {
    try {
      await updateDriverAvailability(driverId, isAvailable);
      await loadDrivers();
    } catch (error) {
      logger.error('Failed to update driver availability:', error);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to remove this driver?')) return;

    try {
      await deleteDriver(driverId);
      await loadDrivers();
    } catch (error) {
      logger.error('Failed to delete driver:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <div>Loading drivers...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Drivers Management
        </h1>
        <p style={{ color: '#6b7280' }}>
          Manage your delivery drivers and monitor their status
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Total Drivers
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.total}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Available
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {stats.available}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Busy
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.busy}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Avg Rating
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
            {stats.avgRating.toFixed(1)} ★
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Total Deliveries
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {stats.totalDeliveries}
          </div>
        </div>
      </div>

      <div style={{
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search drivers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '10px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as DriverStatus | 'all')}
          style={{
            padding: '10px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
          <option value="on_break">On Break</option>
        </select>

        <button
          onClick={loadDrivers}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {displayedDrivers.length === 0 ? (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            No drivers found
          </div>
          <div style={{ color: '#6b7280' }}>
            {searchTerm || selectedStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first driver to get started'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {displayedDrivers.map(driver => (
            <div
              key={driver.id}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {driver.user_id}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {driver.vehicle_type} • {driver.vehicle_plate}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {driver.phone || 'No phone'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  Rating
                </div>
                <div style={{ fontWeight: 'bold' }}>
                  {driver.rating?.toFixed(1) || '5.0'} ★
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  Deliveries
                </div>
                <div style={{ fontWeight: 'bold' }}>
                  {driver.total_deliveries || 0}
                </div>
              </div>

              <div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: getStatusColor(driver.status),
                  color: 'white'
                }}>
                  {driver.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedDriver(driver)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Details
                </button>
                <button
                  onClick={() => handleDeleteDriver(driver.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: DriverStatus): string {
  switch (status) {
    case 'available':
      return '#10b981';
    case 'busy':
      return '#3b82f6';
    case 'on_break':
      return '#fbbf24';
    case 'offline':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}
