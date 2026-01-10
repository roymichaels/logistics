import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundStatCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundLoadingSpinner,
  UndergroundBadge
} from '../../components/underground';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface Driver {
  id: string;
  user_id: string;
  active: boolean;
  created_at: string;
  total_deliveries?: number;
  rating?: number;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
}

export function BusinessDrivers() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadDrivers();

    if (!currentBusinessId) return;

    const subscription = supabase
      .channel(`business-drivers-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_profiles',
          filter: `business_id=eq.${currentBusinessId}`
        },
        () => {
          logger.info('[BusinessDrivers] Real-time update received');
          loadDrivers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId]);

  const loadDrivers = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessDrivers] No business context');
        return;
      }

      const { data: driversData, error } = await supabase
        .from('driver_profiles')
        .select('id, user_id, active, created_at')
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[BusinessDrivers] Error loading drivers:', error);
        return;
      }

      const userIds = Array.from(new Set(driversData?.map(d => d.user_id).filter(Boolean)));

      let profilesMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email')
          .in('id', userIds);

        profiles?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const driverIds = driversData?.map(d => d.id) || [];
      let deliveriesMap = new Map<string, number>();

      if (driverIds.length > 0) {
        const { data: assignments } = await supabase
          .from('driver_assignments')
          .select('driver_id')
          .in('driver_id', driverIds)
          .eq('status', 'delivered');

        assignments?.forEach(assignment => {
          const count = deliveriesMap.get(assignment.driver_id) || 0;
          deliveriesMap.set(assignment.driver_id, count + 1);
        });
      }

      const enrichedDrivers = (driversData || []).map(driver => {
        const profile = driver.user_id ? profilesMap.get(driver.user_id) : null;
        return {
          ...driver,
          user_name: profile?.full_name || 'נהג לא ידוע',
          user_phone: profile?.phone || '',
          user_email: profile?.email || '',
          total_deliveries: deliveriesMap.get(driver.id) || 0,
          rating: 4.5
        };
      });

      setDrivers(enrichedDrivers);
      logger.info('[BusinessDrivers] Drivers loaded:', enrichedDrivers.length);
    } catch (error) {
      logger.error('[BusinessDrivers] Failed to load drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDriverStatus = async (driverId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ active: !currentActive })
        .eq('id', driverId);

      if (error) {
        logger.error('[BusinessDrivers] Error toggling driver status:', error);
        return;
      }

      logger.info('[BusinessDrivers] Driver status toggled:', { driverId, newStatus: !currentActive });
      loadDrivers();
    } catch (error) {
      logger.error('[BusinessDrivers] Failed to toggle driver status:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short' }).format(date);
  };

  const exportDrivers = () => {
    const csvData = [
      ['שם', 'טלפון', 'אימייל', 'סטטוס', 'משלוחים', 'דירוג', 'תאריך הצטרפות'],
      ...filteredDrivers.map(d => [
        d.user_name || '',
        d.user_phone || '',
        d.user_email || '',
        d.active ? 'פעיל' : 'לא פעיל',
        d.total_deliveries || 0,
        d.rating || 0,
        formatDate(d.created_at)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drivers.csv';
    a.click();
    logger.info('[BusinessDrivers] Drivers exported');
  };

  const filteredDrivers = drivers
    .filter(d => {
      const matchesSearch = searchQuery === '' ||
        d.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.user_phone?.includes(searchQuery) ||
        d.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && d.active) ||
        (statusFilter === 'inactive' && !d.active);

      return matchesSearch && matchesStatus;
    });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.active).length,
    inactive: drivers.filter(d => !d.active).length,
    totalDeliveries: drivers.reduce((sum, d) => sum + (d.total_deliveries || 0), 0),
    avgRating: drivers.length > 0
      ? (drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length).toFixed(1)
      : '0.0'
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundLoadingSpinner text="טוען נהגים..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['3xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        icon="🚗"
        title="ניהול נהגים"
        subtitle="נהל ועקוב אחר הנהגים שלך"
        actions={
          <UndergroundButton onClick={exportDrivers} variant="primary">
            ייצוא CSV
          </UndergroundButton>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundStatCard
          icon="🚗"
          label="סה״כ נהגים"
          value={stats.total}
        />
        <UndergroundStatCard
          icon="✅"
          label="נהגים פעילים"
          value={stats.active}
          color={undergroundTheme.colors.status.success}
          onClick={() => setStatusFilter('active')}
        />
        <UndergroundStatCard
          icon="⏸️"
          label="נהגים לא פעילים"
          value={stats.inactive}
          color={undergroundTheme.colors.text.muted}
          onClick={() => setStatusFilter('inactive')}
        />
        <UndergroundStatCard
          icon="📦"
          label="סה״כ משלוחים"
          value={stats.totalDeliveries}
          color={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon="⭐"
          label="דירוג ממוצע"
          value={stats.avgRating}
          color={undergroundTheme.colors.accent.secondary}
        />
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: undergroundTheme.spacing.md }}>
          <UndergroundInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
          />

          <UndergroundSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעילים</option>
            <option value="inactive">לא פעילים</option>
          </UndergroundSelect>

          <UndergroundButton onClick={loadDrivers} variant="secondary">
            🔄
          </UndergroundButton>
        </div>
      </UndergroundCard>

      <UndergroundCard>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>נהג</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>טלפון</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>סטטוס</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>משלוחים</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>דירוג</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>תאריך הצטרפות</th>
                <th style={{ padding: '16px', textAlign: 'right', color: undergroundTheme.colors.text.tertiary, fontWeight: '600' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: undergroundTheme.colors.text.muted }}>
                    לא נמצאו נהגים
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} style={{
                    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    transition: undergroundTheme.transitions.fast,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: undergroundTheme.colors.text.primary }}>
                        {driver.user_name}
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.muted,
                        marginTop: '2px',
                        fontFamily: undergroundTheme.typography.fontFamily.mono
                      }}>
                        {driver.user_email}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: undergroundTheme.colors.text.secondary }}>
                      {driver.user_phone || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <UndergroundBadge variant={driver.active ? 'success' : 'default'}>
                        {driver.active ? 'פעיל' : 'לא פעיל'}
                      </UndergroundBadge>
                    </td>
                    <td style={{
                      padding: '16px',
                      color: undergroundTheme.colors.accent.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.bold
                    }}>
                      {driver.total_deliveries || 0}
                    </td>
                    <td style={{ padding: '16px', color: undergroundTheme.colors.text.secondary }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⭐</span>
                        <span style={{ color: undergroundTheme.colors.accent.secondary }}>
                          {driver.rating?.toFixed(1) || '0.0'}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: undergroundTheme.colors.text.secondary }}>
                      {formatDate(driver.created_at)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <UndergroundButton
                        onClick={() => toggleDriverStatus(driver.id, driver.active)}
                        variant={driver.active ? 'secondary' : 'primary'}
                        size="sm"
                      >
                        {driver.active ? 'השבת' : 'הפעל'}
                      </UndergroundButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: undergroundTheme.spacing['2xl'],
          padding: undergroundTheme.spacing.lg,
          background: undergroundTheme.colors.glassmorphism.light,
          borderRadius: undergroundTheme.borderRadius.md,
          color: undergroundTheme.colors.text.tertiary,
          fontSize: undergroundTheme.typography.fontSize.sm,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
        }}>
          <strong>סה״כ:</strong> {filteredDrivers.length} נהגים (מתוך {drivers.length})
        </div>
      </UndergroundCard>
    </div>
  );
}
