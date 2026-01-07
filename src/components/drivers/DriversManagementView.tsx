import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { tokens } from '../../styles/tokens';
import { DriverStatsCard, DriverStatusBadge } from './shared';

interface Driver {
  id: string;
  user_id: string;
  business_id?: string;
  status: 'available' | 'busy' | 'offline' | 'on_break';
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  rating?: number;
  total_deliveries?: number;
}

interface DriversManagementViewProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

export function DriversManagementView({
  businessId,
  role,
  userId,
  onNavigate
}: DriversManagementViewProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | Driver['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

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
      logger.info('[DriversManagementView] Drivers loaded:', filtered.length);
    } catch (error) {
      logger.error('[DriversManagementView] Failed to load drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const displayedDrivers = useMemo(() => {
    let result = drivers;

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
  }, [drivers, selectedStatus, searchTerm]);

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

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר את הנהג?')) return;

    try {
      const updatedDrivers = drivers.filter(d => d.id !== driverId);
      localStorage.setItem('drivers', JSON.stringify(updatedDrivers));
      await loadDrivers();
      logger.info('[DriversManagementView] Driver deleted:', driverId);
    } catch (error) {
      logger.error('[DriversManagementView] Failed to delete driver:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: tokens.colors.panel
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            טוען נהגים...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: tokens.colors.text
          }}>
            ניהול נהגים
          </h1>
          <p style={{ margin: '0', color: tokens.colors.subtle, fontSize: '16px' }}>
            נהל את נהגי המשלוחים ועקוב אחר הסטטוס שלהם
          </p>
        </div>
        {(role === 'superadmin' || role === 'admin') && (
          <button
            onClick={() => onNavigate?.('/admin/driver-applications')}
            style={{
              padding: '12px 24px',
              background: tokens.gradients.primary,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: tokens.glows.primaryStrong,
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '18px' }}>📋</span>
            בקשות נהגים
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <DriverStatsCard
          icon="👥"
          value={stats.total}
          label="סה״כ נהגים"
        />
        <DriverStatsCard
          icon="🟢"
          value={stats.available}
          label="זמינים"
          color={tokens.colors.status.success}
        />
        <DriverStatsCard
          icon="🔵"
          value={stats.busy}
          label="עסוקים"
          color={tokens.colors.status.info}
        />
        <DriverStatsCard
          icon="⭐"
          value={stats.avgRating.toFixed(1)}
          label="דירוג ממוצע"
          color={tokens.colors.status.warning}
        />
        <DriverStatsCard
          icon="📦"
          value={stats.totalDeliveries}
          label="סה״כ משלוחים"
        />
      </div>

      {/* Filters */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="חיפוש נהגים..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '12px 16px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '12px',
            fontSize: '14px',
            background: tokens.colors.background.card,
            color: tokens.colors.text
          }}
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          style={{
            padding: '12px 16px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '12px',
            fontSize: '14px',
            background: tokens.colors.background.card,
            color: tokens.colors.text
          }}
        >
          <option value="all">כל הסטטוסים</option>
          <option value="available">זמין</option>
          <option value="busy">עסוק</option>
          <option value="offline">לא מחובר</option>
          <option value="on_break">הפסקה</option>
        </select>

        <button
          onClick={loadDrivers}
          style={{
            padding: '12px 24px',
            background: tokens.gradients.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: tokens.glows.primary
          }}
        >
          רענן
        </button>
      </div>

      {/* Drivers List */}
      {displayedDrivers.length === 0 ? (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          background: tokens.colors.background.card,
          borderRadius: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚗</div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '8px'
          }}>
            לא נמצאו נהגים
          </div>
          <div style={{ color: tokens.colors.subtle, fontSize: '14px' }}>
            {searchTerm || selectedStatus !== 'all'
              ? 'נסה לשנות את המסננים'
              : 'הוסף את הנהג הראשון שלך כדי להתחיל'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {displayedDrivers.map(driver => (
            <div
              key={driver.id}
              style={{
                padding: '20px',
                background: tokens.colors.background.card,
                borderRadius: '16px',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                boxShadow: tokens.shadows.md,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              {/* Driver Info */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  fontWeight: '700',
                  fontSize: '16px',
                  color: tokens.colors.text,
                  marginBottom: '4px'
                }}>
                  {driver.user_id}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: tokens.colors.subtle,
                  marginBottom: '2px'
                }}>
                  {driver.vehicle_type} • {driver.vehicle_plate}
                </div>
                <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
                  {driver.phone || 'אין טלפון'}
                </div>
              </div>

              {/* Rating */}
              <div style={{
                textAlign: 'center',
                padding: '12px 16px',
                background: tokens.colors.bg,
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '4px'
                }}>
                  דירוג
                </div>
                <div style={{
                  fontWeight: '700',
                  fontSize: '18px',
                  color: tokens.colors.text
                }}>
                  {driver.rating?.toFixed(1) || '5.0'} ⭐
                </div>
              </div>

              {/* Deliveries */}
              <div style={{
                textAlign: 'center',
                padding: '12px 16px',
                background: tokens.colors.bg,
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '4px'
                }}>
                  משלוחים
                </div>
                <div style={{
                  fontWeight: '700',
                  fontSize: '18px',
                  color: tokens.colors.text
                }}>
                  {driver.total_deliveries || 0}
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <DriverStatusBadge status={driver.status} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedDriver(driver)}
                  style={{
                    padding: '10px 20px',
                    background: tokens.colors.bg,
                    border: `1px solid ${tokens.colors.background.cardBorder}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: tokens.colors.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  פרטים
                </button>
                <button
                  onClick={() => handleDeleteDriver(driver.id)}
                  style={{
                    padding: '10px 20px',
                    background: `${tokens.colors.status.error}15`,
                    color: tokens.colors.status.error,
                    border: `1px solid ${tokens.colors.status.error}30`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  הסר
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div
          onClick={() => setSelectedDriver(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: tokens.colors.background.card,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              פרטי נהג
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: tokens.colors.bg,
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '4px'
                }}>
                  מזהה משתמש
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  {selectedDriver.user_id}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: tokens.colors.bg,
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '4px'
                }}>
                  טלפון
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  {selectedDriver.phone || 'לא צוין'}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: tokens.colors.bg,
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '4px'
                }}>
                  רכב
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  {selectedDriver.vehicle_type} • {selectedDriver.vehicle_plate}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{
                  padding: '16px',
                  background: tokens.colors.bg,
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: tokens.colors.subtle,
                    marginBottom: '4px'
                  }}>
                    דירוג
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: tokens.colors.text
                  }}>
                    {selectedDriver.rating?.toFixed(1) || '5.0'} ⭐
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: tokens.colors.bg,
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: tokens.colors.subtle,
                    marginBottom: '4px'
                  }}>
                    משלוחים
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: tokens.colors.text
                  }}>
                    {selectedDriver.total_deliveries || 0}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: tokens.colors.bg,
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  marginBottom: '8px'
                }}>
                  סטטוס נוכחי
                </div>
                <DriverStatusBadge status={selectedDriver.status} size="large" />
              </div>
            </div>

            <button
              onClick={() => setSelectedDriver(null)}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: tokens.gradients.primary,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: tokens.glows.primaryStrong
              }}
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
