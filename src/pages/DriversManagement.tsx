import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDrivers, useDriver, useStartShift, useEndShift, useUpdateDriverLocation } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';

import { tokens, styles } from '../styles/tokens';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';
import type { FrontendDataStore } from '../lib/frontendDataStore';

interface DriversManagementProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

type ViewMode = 'list' | 'map' | 'analytics';
type StatusFilter = 'all' | 'online' | 'offline' | 'busy' | 'available' | 'on_break';

export function DriversManagement({ dataStore }: DriversManagementProps) {
  const { t } = useI18n();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const app = useApp();
  const { drivers, loading, error, refetch } = useDrivers({
    status: statusFilter === 'all' ? undefined : statusFilter,
    available_only: statusFilter === 'available'
  });

  useEffect(() => {
    const unsubscribe = app.events?.on('DriverStatusChanged', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'DriverStatusChanged received, refetching drivers' });
      refetch();
    });

    const unsubscribeShift = app.events?.on('ShiftStarted', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ShiftStarted received, refetching drivers' });
      refetch();
    });

    const unsubscribeShiftEnd = app.events?.on('ShiftEnded', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ShiftEnded received, refetching drivers' });
      refetch();
    });

    return () => {
      unsubscribe?.();
      unsubscribeShift?.();
      unsubscribeShiftEnd?.();
    };
  }, [app.events, refetch]);

  const handleRefresh = async () => {
    Diagnostics.logEvent({ type: 'log', message: 'Manual refresh triggered' });
    await refetch();

  };

  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;

    const query = searchQuery.toLowerCase();
    return drivers.filter(driver =>
      driver.name?.toLowerCase().includes(query) ||
      driver.phone?.toLowerCase().includes(query) ||
      driver.vehicle_plate?.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  const metrics = useMemo(() => ({
    total: drivers.length,
    online: drivers.filter(d => d.is_online).length,
    busy: drivers.filter(d => d.active_orders > 0).length,
    available: drivers.filter(d => d.is_online && d.active_orders === 0).length,
    avgRating: drivers.reduce((sum, d) => sum + (d.rating || 5.0), 0) / (drivers.length || 1),
    totalDeliveries: drivers.reduce((sum, d) => sum + d.active_orders, 0)
  }), [drivers]);

  if (loading && drivers.length === 0) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <div style={{ color: tokens.colors.text.secondary }}>{t('driversManagementPage.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ color: tokens.colors.text.primary, marginBottom: '16px' }}>
          {error.message || t('driversManagementPage.errorLoadingDrivers')}
        </div>
        <button
          onClick={refetch}
          style={{
            padding: '12px 24px',
            background: tokens.gradients.primary,
            border: 'none',
            borderRadius: '12px',
            color: tokens.colors.text.primaryBright,
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {t('driversManagementPage.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ ...styles.pageTitle, margin: 0 }}>{t('driversManagementPage.title')}</h1>
          <p style={{ ...styles.pageSubtitle, margin: '4px 0 0 0' }}>
            {filteredDrivers.length} {t('driversManagementPage.driversOutOf')} {drivers.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `2px solid ${tokens.colors.brand.primary}`,
              borderRadius: '12px',
              color: tokens.colors.brand.primary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? '⟳' : '🔄'} {t('driversManagementPage.refresh')}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 16px',
              background: showFilters ? tokens.gradients.primary : 'transparent',
              border: `2px solid ${tokens.colors.brand.primary}`,
              borderRadius: '12px',
              color: showFilters ? tokens.colors.text.primaryBright : tokens.colors.brand.primary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔍 {t('driversManagementPage.filter')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={styles.stat.box}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <div style={{ ...styles.stat.value, fontSize: '28px' }}>{metrics.total}</div>
          <div style={styles.stat.label}>{t('driversManagementPage.totalDrivers')}</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🟢</div>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.success, fontSize: '28px' }}>{metrics.online}</div>
          <div style={styles.stat.label}>{t('driversManagementPage.online')}</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.info, fontSize: '28px' }}>{metrics.busy}</div>
          <div style={styles.stat.label}>{t('driversManagementPage.busy')}</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.warning, fontSize: '28px' }}>{metrics.avgRating.toFixed(1)}</div>
          <div style={styles.stat.label}>{t('driversManagementPage.averageRating')}</div>
        </div>
      </div>

      {showFilters && (
        <div style={{ ...styles.card, marginBottom: '20px', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder={t('driversManagementPage.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: tokens.colors.background.secondary,
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                borderRadius: '12px',
                color: tokens.colors.text.primary,
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(['all', 'online', 'offline', 'busy', 'available', 'on_break'] as StatusFilter[]).map(filter => {
              const labels: Record<StatusFilter, string> = {
                all: t('driversManagementPage.all'),
                online: t('driversManagementPage.online'),
                offline: t('driversManagementPage.offline'),
                busy: t('driversManagementPage.busy'),
                available: t('driversManagementPage.available'),
                on_break: t('driversManagementPage.onBreak')
              };

              return (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter);

                    Diagnostics.logEvent({ type: 'log', message: 'Filter changed', data: { filter } });
                  }}
                  style={{
                    padding: '8px 16px',
                    background: statusFilter === filter ? tokens.gradients.primary : 'transparent',
                    border: `1px solid ${statusFilter === filter ? 'transparent' : tokens.colors.background.cardBorder}`,
                    borderRadius: '10px',
                    color: statusFilter === filter ? tokens.colors.text.primaryBright : tokens.colors.text.secondary,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['list', 'map', 'analytics'] as ViewMode[]).map(mode => {
              const icons = { list: '📋', map: '🗺️', analytics: '📊' };
              const labels = {
                list: t('driversManagementPage.list'),
                map: t('driversManagementPage.map'),
                analytics: t('driversManagementPage.analytics')
              };

              return (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);

                    Diagnostics.logEvent({ type: 'log', message: 'View mode changed', data: { mode } });
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: viewMode === mode ? tokens.gradients.primary : tokens.colors.background.secondary,
                    border: 'none',
                    borderRadius: '10px',
                    color: viewMode === mode ? tokens.colors.text.primaryBright : tokens.colors.text.primary,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: viewMode === mode ? tokens.glows.primary : 'none'
                  }}
                >
                  {icons[mode]} {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDrivers.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>🚗</div>
              <div style={{ fontSize: '18px', color: tokens.colors.text.primary, fontWeight: '600', marginBottom: '8px' }}>
                {t('driversManagementPage.noDriversFound')}
              </div>
              <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                {t('driversManagementPage.tryChangingFilter')}
              </div>
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <div
                key={driver.id}
                onClick={() => {
                  setSelectedDriverId(driver.id);

                  Diagnostics.logEvent({ type: 'nav', message: 'Navigate to driver detail', data: { driverId: driver.id } });
                }}
                style={{
                  ...styles.card,
                  cursor: 'pointer',
                  background: selectedDriverId === driver.id
                    ? tokens.gradients.card
                    : tokens.colors.background.secondary,
                  border: `2px solid ${selectedDriverId === driver.id
                    ? tokens.colors.brand.primary
                    : tokens.colors.background.cardBorder}`,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: driver.is_online ? tokens.gradients.success : tokens.colors.background.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: `2px solid ${driver.is_online ? tokens.colors.status.success : tokens.colors.background.cardBorder}`
                    }}>
                      🚗
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: tokens.colors.text.primary, marginBottom: '4px' }}>
                        {driver.name || driver.id}
                      </div>
                      <div style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>
                        {driver.vehicle_type || 'Unknown'} • {driver.vehicle_plate || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: driver.is_online ? `${tokens.colors.status.success}20` : `${tokens.colors.status.error}20`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: driver.is_online ? tokens.colors.status.success : tokens.colors.status.error
                  }}>
                    {driver.is_online ? `🟢 ${t('driversManagementPage.online')}` : `⚫ ${t('driversManagementPage.offline')}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: tokens.colors.background.primary,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.status.info }}>
                      {driver.active_orders || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.secondary }}>{t('driversManagementPage.active')}</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: tokens.colors.background.primary,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.status.warning }}>
                      {(driver.rating || 5.0).toFixed(1)}⭐
                    </div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.secondary }}>{t('driversManagementPage.rating')}</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: tokens.colors.background.primary,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.status.success }}>
                      {driver.completed_today || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.secondary }}>{t('driversManagementPage.today')}</div>
                  </div>
                </div>

                {driver.phone && (
                  <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📞 {driver.phone}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'map' && (
        <div style={{ ...styles.card, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '18px', color: tokens.colors.text.primary, fontWeight: '600', marginBottom: '8px' }}>
            {t('driversManagementPage.mapView')}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
            {t('driversManagementPage.mapViewComingSoon')}
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div style={{ ...styles.card, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', color: tokens.colors.text.primary, fontWeight: '600', marginBottom: '8px' }}>
            {t('driversManagementPage.analyticsView')}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
            {t('driversManagementPage.analyticsViewComingSoon')}
          </div>
        </div>
      )}
    </div>
  );
}
