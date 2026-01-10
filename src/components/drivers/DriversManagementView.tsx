import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundStatCard,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundInput,
  UndergroundSelect,
  UndergroundBadge,
  UndergroundHeader,
  UndergroundSection
} from '../underground';
import { DriverStatsCard, DriverStatusBadge } from './shared';
import { Toast } from '../Toast';

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
  active: boolean;
  created_at: string;
  profiles?: {
    full_name?: string;
    phone?: string;
  };
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

    const channel = supabase
      .channel('drivers-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_profiles'
        },
        () => {
          logger.info('[DriversManagementView] Driver update detected, refreshing...');
          loadDrivers();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [businessId]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[DriversManagementView] Failed to load drivers:', error);
        Toast.error('Failed to load drivers');
        setDrivers([]);
        return;
      }

      setDrivers(data || []);
      logger.info('[DriversManagementView] Drivers loaded:', data?.length || 0);
    } catch (error) {
      logger.error('[DriversManagementView] Failed to load drivers:', error);
      Toast.error('Failed to load drivers');
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
        d.vehicle_type?.toLowerCase().includes(term) ||
        d.profiles?.full_name?.toLowerCase().includes(term)
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
      const { error } = await supabase
        .from('driver_profiles')
        .update({ active: false })
        .eq('id', driverId);

      if (error) {
        logger.error('[DriversManagementView] Failed to deactivate driver:', error);
        Toast.error('Failed to remove driver');
        return;
      }

      await loadDrivers();
      Toast.success('Driver removed successfully');
      logger.info('[DriversManagementView] Driver deactivated:', driverId);
    } catch (error) {
      logger.error('[DriversManagementView] Failed to delete driver:', error);
      Toast.error('Failed to remove driver');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl'],
      direction: 'rtl'
    }}>
      <UndergroundHeader
        title="ניהול נהגים"
        subtitle="נהל את נהגי המשלוחים ועקוב אחר הסטטוס שלהם"
        action={
          (role === 'superadmin' || role === 'admin') ? (
            <UndergroundButton
              variant="primary"
              onClick={() => onNavigate?.('/admin/driver-applications')}
            >
              <span style={{ marginLeft: undergroundTheme.spacing.sm }}>📋</span>
              בקשות נהגים
            </UndergroundButton>
          ) : undefined
        }
      />

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing['3xl']
        }}>
          <UndergroundStatCard
            icon="👥"
            value={stats.total.toString()}
            label="סה״כ נהגים"
          />
          <UndergroundStatCard
            icon="🟢"
            value={stats.available.toString()}
            label="זמינים"
            accentColor={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            icon="🔵"
            value={stats.busy.toString()}
            label="עסוקים"
            accentColor={undergroundTheme.colors.status.info}
          />
          <UndergroundStatCard
            icon="⭐"
            value={stats.avgRating.toFixed(1)}
            label="דירוג ממוצע"
            accentColor={undergroundTheme.colors.status.warning}
          />
          <UndergroundStatCard
            icon="📦"
            value={stats.totalDeliveries.toString()}
            label="סה״כ משלוחים"
            accentColor={undergroundTheme.colors.primary.cyan}
          />
        </div>

        <div style={{
          marginBottom: undergroundTheme.spacing['2xl'],
          display: 'flex',
          gap: undergroundTheme.spacing.lg,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <UndergroundInput
            type="text"
            placeholder="חיפוש נהגים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />

          <UndergroundSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            options={[
              { value: 'all', label: 'כל הסטטוסים' },
              { value: 'available', label: 'זמין' },
              { value: 'busy', label: 'עסוק' },
              { value: 'offline', label: 'לא מחובר' },
              { value: 'on_break', label: 'הפסקה' }
            ]}
          />

          <UndergroundButton
            variant="secondary"
            onClick={loadDrivers}
          >
            רענן
          </UndergroundButton>
        </div>

        {displayedDrivers.length === 0 ? (
          <UndergroundEmptyState
            icon="🚗"
            title="לא נמצאו נהגים"
            description={
              searchTerm || selectedStatus !== 'all'
                ? 'נסה לשנות את המסננים'
                : 'הוסף את הנהג הראשון שלך כדי להתחיל'
            }
          />
        ) : (
          <div style={{ display: 'grid', gap: undergroundTheme.spacing.lg }}>
            {displayedDrivers.map(driver => (
              <UndergroundCard key={driver.id} variant="light">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.lg,
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs,
                      textShadow: undergroundTheme.shadows.glow.text
                    }}>
                      {driver.profiles?.full_name || driver.user_id}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {driver.vehicle_type || 'לא צוין'} • {driver.vehicle_plate || 'אין לוחית'}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {driver.phone || driver.profiles?.phone || 'אין טלפון'}
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.surface.darker,
                    borderRadius: undergroundTheme.borderRadius.lg,
                    border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                    minWidth: '90px'
                  }}>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      דירוג
                    </div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {driver.rating?.toFixed(1) || '5.0'} ⭐
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.surface.darker,
                    borderRadius: undergroundTheme.borderRadius.lg,
                    border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                    minWidth: '90px'
                  }}>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      משלוחים
                    </div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {driver.total_deliveries || 0}
                    </div>
                  </div>

                  <div>
                    <DriverStatusBadge status={driver.status} />
                  </div>

                  <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                    <UndergroundButton
                      variant="secondary"
                      onClick={() => setSelectedDriver(driver)}
                      size="small"
                    >
                      פרטים
                    </UndergroundButton>
                    <UndergroundButton
                      variant="danger"
                      onClick={() => handleDeleteDriver(driver.id)}
                      size="small"
                    >
                      הסר
                    </UndergroundButton>
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>
        )}
      </UndergroundSection>

      {selectedDriver && (
        <div
          onClick={() => setSelectedDriver(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: undergroundTheme.spacing.xl
          }}
        >
          <UndergroundCard
            variant="darker"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '100%'
            }}
          >
            <h2 style={{
              fontSize: undergroundTheme.typography.fontSize['3xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing['2xl'],
              textAlign: 'center',
              textShadow: undergroundTheme.shadows.glow.cyan
            }}>
              פרטי נהג
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
              <div style={{
                padding: undergroundTheme.spacing.lg,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  שם מלא
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {selectedDriver.profiles?.full_name || selectedDriver.user_id}
                </div>
              </div>

              <div style={{
                padding: undergroundTheme.spacing.lg,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  טלפון
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {selectedDriver.phone || selectedDriver.profiles?.phone || 'לא צוין'}
                </div>
              </div>

              <div style={{
                padding: undergroundTheme.spacing.lg,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  רכב
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {selectedDriver.vehicle_type || 'לא צוין'} • {selectedDriver.vehicle_plate || 'אין לוחית'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: undergroundTheme.spacing.md }}>
                <div style={{
                  padding: undergroundTheme.spacing.lg,
                  background: undergroundTheme.colors.surface.darker,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    דירוג
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize['3xl'],
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {selectedDriver.rating?.toFixed(1) || '5.0'} ⭐
                  </div>
                </div>

                <div style={{
                  padding: undergroundTheme.spacing.lg,
                  background: undergroundTheme.colors.surface.darker,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    משלוחים
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize['3xl'],
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {selectedDriver.total_deliveries || 0}
                  </div>
                </div>
              </div>

              <div style={{
                padding: undergroundTheme.spacing.lg,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.sm
                }}>
                  סטטוס נוכחי
                </div>
                <DriverStatusBadge status={selectedDriver.status} size="large" />
              </div>
            </div>

            <UndergroundButton
              variant="primary"
              onClick={() => setSelectedDriver(null)}
              style={{
                width: '100%',
                marginTop: undergroundTheme.spacing['2xl']
              }}
            >
              סגור
            </UndergroundButton>
          </UndergroundCard>
        </div>
      )}
    </div>
  );
}
