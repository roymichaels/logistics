import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDrivers, useDriver, useStartShift, useEndShift, useUpdateDriverLocation } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';

import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { logger } from '../lib/logger';
import type { FrontendDataStore } from '../lib/frontendDataStore';

interface DriversManagementProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

type ViewMode = 'list' | 'map' | 'analytics';
type StatusFilter = 'all' | 'online' | 'offline' | 'busy' | 'available' | 'on_break';

export function DriversManagement({ dataStore }: DriversManagementProps) {
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
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <div style={{ color: ROYAL_COLORS.muted }}>Loading drivers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ color: ROYAL_COLORS.text, marginBottom: '16px' }}>
          {error.message || 'Failed to load drivers'}
        </div>
        <button
          onClick={refetch}
          style={{
            padding: '12px 24px',
            background: ROYAL_COLORS.gradientPurple,
            border: 'none',
            borderRadius: '12px',
            color: ROYAL_COLORS.textBright,
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ ...ROYAL_STYLES.pageTitle, margin: 0 }}>Driver Management</h1>
          <p style={{ ...ROYAL_STYLES.pageSubtitle, margin: '4px 0 0 0' }}>
            {filteredDrivers.length} of {drivers.length} drivers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `2px solid ${ROYAL_COLORS.accent}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? '⟳' : '🔄'} Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 16px',
              background: showFilters ? ROYAL_COLORS.gradientPurple : 'transparent',
              border: `2px solid ${ROYAL_COLORS.accent}`,
              borderRadius: '12px',
              color: showFilters ? ROYAL_COLORS.textBright : ROYAL_COLORS.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔍 Filter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <div style={{ ...ROYAL_STYLES.statValue, fontSize: '28px' }}>{metrics.total}</div>
          <div style={ROYAL_STYLES.statLabel}>Total Drivers</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🟢</div>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.success, fontSize: '28px' }}>{metrics.online}</div>
          <div style={ROYAL_STYLES.statLabel}>Online</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.info, fontSize: '28px' }}>{metrics.busy}</div>
          <div style={ROYAL_STYLES.statLabel}>Busy</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold, fontSize: '28px' }}>{metrics.avgRating.toFixed(1)}</div>
          <div style={ROYAL_STYLES.statLabel}>Avg Rating</div>
        </div>
      </div>

      {showFilters && (
        <div style={{ ...ROYAL_STYLES.card, marginBottom: '20px', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by name, phone or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(['all', 'online', 'offline', 'busy', 'available', 'on_break'] as StatusFilter[]).map(filter => {
              const labels: Record<StatusFilter, string> = {
                all: 'All',
                online: 'Online',
                offline: 'Offline',
                busy: 'Busy',
                available: 'Available',
                on_break: 'On Break'
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
                    background: statusFilter === filter ? ROYAL_COLORS.gradientPurple : 'transparent',
                    border: `1px solid ${statusFilter === filter ? 'transparent' : ROYAL_COLORS.cardBorder}`,
                    borderRadius: '10px',
                    color: statusFilter === filter ? ROYAL_COLORS.textBright : ROYAL_COLORS.muted,
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
              const labels = { list: 'List', map: 'Map', analytics: 'Analytics' };

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
                    background: viewMode === mode ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.secondary,
                    border: 'none',
                    borderRadius: '10px',
                    color: viewMode === mode ? ROYAL_COLORS.textBright : ROYAL_COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: viewMode === mode ? ROYAL_COLORS.glowPurple : 'none'
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
            <div style={{ ...ROYAL_STYLES.card, textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>🚗</div>
              <div style={{ fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '8px' }}>
                No drivers found
              </div>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                Try changing your filters or search query
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
                  ...ROYAL_STYLES.card,
                  cursor: 'pointer',
                  background: selectedDriverId === driver.id
                    ? ROYAL_COLORS.gradientCard
                    : ROYAL_COLORS.secondary,
                  border: `2px solid ${selectedDriverId === driver.id
                    ? ROYAL_COLORS.accent
                    : ROYAL_COLORS.cardBorder}`,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: driver.is_online ? ROYAL_COLORS.gradientSuccess : ROYAL_COLORS.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: `2px solid ${driver.is_online ? ROYAL_COLORS.success : ROYAL_COLORS.cardBorder}`
                    }}>
                      🚗
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                        {driver.name || driver.id}
                      </div>
                      <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                        {driver.vehicle_type || 'Unknown'} • {driver.vehicle_plate || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: driver.is_online ? `${ROYAL_COLORS.success}20` : `${ROYAL_COLORS.error}20`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: driver.is_online ? ROYAL_COLORS.success : ROYAL_COLORS.error
                  }}>
                    {driver.is_online ? '🟢 Online' : '⚫ Offline'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: ROYAL_COLORS.background,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.info }}>
                      {driver.active_orders || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>Active</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: ROYAL_COLORS.background,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
                      {(driver.rating || 5.0).toFixed(1)}⭐
                    </div>
                    <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>Rating</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    background: ROYAL_COLORS.background,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.success }}>
                      {driver.completed_today || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>Today</div>
                  </div>
                </div>

                {driver.phone && (
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📞 {driver.phone}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'map' && (
        <div style={{ ...ROYAL_STYLES.card, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '8px' }}>
            Map View
          </div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
            Map view coming soon
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div style={{ ...ROYAL_STYLES.card, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '8px' }}>
            Analytics View
          </div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
            Analytics view coming soon
          </div>
        </div>
      )}
    </div>
  );
}
