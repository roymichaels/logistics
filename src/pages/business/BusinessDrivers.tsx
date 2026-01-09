import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { StatCard } from '../../components/molecules/StatCard';
import { tokens } from '../../styles/tokens';

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
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען נהגים...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🚗"
        title="ניהול נהגים"
        subtitle="נהל ועקוב אחר הנהגים שלך"
        actionButton={
          <button
            onClick={exportDrivers}
            style={{
              padding: '10px 20px',
              background: tokens.colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ייצוא CSV
          </button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="🚗"
          label="סה״כ נהגים"
          value={stats.total}
        />
        <StatCard
          icon="✅"
          label="נהגים פעילים"
          value={stats.active}
          color={tokens.colors.status.success}
          onClick={() => setStatusFilter('active')}
        />
        <StatCard
          icon="⏸️"
          label="נהגים לא פעילים"
          value={stats.inactive}
          color={tokens.colors.subtle}
          onClick={() => setStatusFilter('inactive')}
        />
        <StatCard
          icon="📦"
          label="סה״כ משלוחים"
          value={stats.totalDeliveries}
        />
        <StatCard
          icon="⭐"
          label="דירוג ממוצע"
          value={stats.avgRating}
          color={tokens.colors.accent}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעילים</option>
            <option value="inactive">לא פעילים</option>
          </select>

          <button
            onClick={loadDrivers}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>נהג</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>טלפון</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סטטוס</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>משלוחים</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>דירוג</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>תאריך הצטרפות</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.subtle }}>
                    לא נמצאו נהגים
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: tokens.colors.text }}>
                        {driver.user_name}
                      </div>
                      <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginTop: '2px' }}>
                        {driver.user_email}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {driver.user_phone || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: driver.active
                            ? tokens.colors.status.success + '20'
                            : tokens.colors.subtle + '20',
                          color: driver.active
                            ? tokens.colors.status.success
                            : tokens.colors.subtle
                        }}
                      >
                        {driver.active ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text, fontWeight: '600' }}>
                      {driver.total_deliveries || 0}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⭐</span>
                        <span>{driver.rating?.toFixed(1) || '0.0'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {formatDate(driver.created_at)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => toggleDriverStatus(driver.id, driver.active)}
                        style={{
                          padding: '6px 12px',
                          background: driver.active ? tokens.colors.subtle : tokens.colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {driver.active ? 'השבת' : 'הפעל'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: tokens.colors.surface,
          borderRadius: '8px',
          color: tokens.colors.subtle,
          fontSize: '14px'
        }}>
          <strong>סה״כ:</strong> {filteredDrivers.length} נהגים (מתוך {drivers.length})
        </div>
      </Card>
    </PageContainer>
  );
}
