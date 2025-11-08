import React, { useState, useEffect, useCallback } from 'react';
import { DataStore, User } from '../data/types';
import { DriverService, DriverProfile, DriverStats } from '../lib/driverService';
import { Toast } from '../components/Toast';
import { telegram } from '../lib/telegram';
import { useRoleTheme } from '../hooks/useRoleTheme';
import { DriverDetailPanel } from '../components/DriverDetailPanel';
import { DriverMapView } from '../components/DriverMapView';
import { DriverPerformanceChart } from '../components/DriverPerformanceChart';

interface DriversManagementProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type ViewMode = 'list' | 'map' | 'analytics';
type StatusFilter = 'all' | 'online' | 'offline' | 'busy' | 'available' | 'on_break';

interface DriverWithDetails {
  profile: DriverProfile;
  stats: DriverStats;
  user: User | null;
  isOnline: boolean;
  currentStatus: string;
}

export function DriversManagement({ dataStore }: DriversManagementProps) {
  const [drivers, setDrivers] = useState<DriverWithDetails[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const driverService = new DriverService(dataStore);
  const supabase = dataStore?.supabase;
  const theme = telegram.themeParams;
  const { colors, styles } = useRoleTheme();

  const loadDrivers = useCallback(async () => {
    try {
      if (!supabase) {
        logger.warn('⚠️ Supabase client not available yet, retrying...');
        setLoading(false);
        return;
      }

      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver');

      if (usersError) throw usersError;

      const driversWithDetails = await Promise.all(
        (allUsers || []).map(async (user: User) => {
          const [profile, stats, status] = await Promise.all([
            driverService.getDriverProfile(user.telegram_id),
            driverService.getDriverStats(user.telegram_id),
            dataStore.getDriverStatus?.(user.telegram_id)
          ]);

          return {
            profile: profile || {
              id: '',
              user_id: user.telegram_id,
              rating: 5.0,
              total_deliveries: 0,
              successful_deliveries: 0,
              is_available: false,
              max_orders_capacity: 5,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            stats,
            user,
            isOnline: status?.is_online || false,
            currentStatus: status?.status || 'off_shift'
          };
        })
      );

      setDrivers(driversWithDetails);
    } catch (error) {
      logger.error('Failed to load drivers:', error);
      Toast.error('שגיאה בטעינת נהגים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataStore, driverService, supabase]);

  useEffect(() => {
    loadDrivers();

    if (!supabase) {
      logger.warn('Supabase client not available for subscriptions');
      return;
    }

    const subscription = supabase
      .channel('drivers-management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_profiles' },
        () => loadDrivers()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_statuses' },
        () => loadDrivers()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadDrivers, supabase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    telegram.hapticFeedback('soft');
  };

  const filteredDrivers = drivers.filter(driver => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'online' && !driver.isOnline) return false;
      if (statusFilter === 'offline' && driver.isOnline) return false;
      if (statusFilter === 'busy' && driver.stats.active_orders === 0) return false;
      if (statusFilter === 'available' && (driver.stats.active_orders > 0 || !driver.isOnline)) return false;
      if (statusFilter === 'on_break' && driver.currentStatus !== 'on_break') return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = driver.user?.name?.toLowerCase() || '';
      const phone = driver.user?.phone?.toLowerCase() || '';
      const vehicle = driver.profile.vehicle_plate?.toLowerCase() || '';

      if (!name.includes(query) && !phone.includes(query) && !vehicle.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const metrics = {
    total: drivers.length,
    online: drivers.filter(d => d.isOnline).length,
    busy: drivers.filter(d => d.stats.active_orders > 0).length,
    available: drivers.filter(d => d.isOnline && d.stats.active_orders === 0).length,
    avgRating: drivers.reduce((sum, d) => sum + d.profile.rating, 0) / drivers.length || 5.0,
    totalDeliveries: drivers.reduce((sum, d) => sum + d.stats.active_orders, 0)
  };

  if (loading) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <div style={{ color: colors.muted }}>טוען נהגים...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ ...styles.pageTitle, margin: 0 }}>ניהול נהגים</h1>
          <p style={{ ...styles.pageSubtitle, margin: '4px 0 0 0' }}>
            {filteredDrivers.length} נהגים מתוך {drivers.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
              color: colors.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.5 : 1
            }}
          >
            {refreshing ? '⟳' : '🔄'} רענן
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 16px',
              background: showFilters ? colors.gradientPrimary : 'transparent',
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
              color: showFilters ? colors.textBright : colors.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔍 סינון
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={styles.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <div style={{ ...styles.statValue, fontSize: '28px' }}>{metrics.total}</div>
          <div style={styles.statLabel}>סך נהגים</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🟢</div>
          <div style={{ ...styles.statValue, color: colors.success, fontSize: '28px' }}>{metrics.online}</div>
          <div style={styles.statLabel}>מקוונים</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
          <div style={{ ...styles.statValue, color: colors.info, fontSize: '28px' }}>{metrics.busy}</div>
          <div style={styles.statLabel}>במשלוח</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
          <div style={{ ...styles.statValue, color: colors.gold, fontSize: '28px' }}>{metrics.avgRating.toFixed(1)}</div>
          <div style={styles.statLabel}>דירוג ממוצע</div>
        </div>
      </div>

      {showFilters && (
        <div style={{ ...styles.card, marginBottom: '20px', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="חפש לפי שם, טלפון או רכב..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: colors.secondary,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '12px',
                color: colors.text,
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {(['all', 'online', 'offline', 'busy', 'available', 'on_break'] as StatusFilter[]).map(filter => {
              const labels: Record<StatusFilter, string> = {
                all: 'הכל',
                online: 'מקוון',
                offline: 'לא מקוון',
                busy: 'עסוק',
                available: 'זמין',
                on_break: 'בהפסקה'
              };

              return (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter);
                    telegram.hapticFeedback('selection');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: statusFilter === filter ? colors.gradientPrimary : 'transparent',
                    border: `1px solid ${statusFilter === filter ? 'transparent' : colors.cardBorder}`,
                    borderRadius: '10px',
                    color: statusFilter === filter ? colors.textBright : colors.muted,
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
              const labels = { list: 'רשימה', map: 'מפה', analytics: 'ניתוח' };

              return (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    telegram.hapticFeedback('selection');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: viewMode === mode ? colors.gradientPrimary : colors.secondary,
                    border: 'none',
                    borderRadius: '10px',
                    color: viewMode === mode ? colors.textBright : colors.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: viewMode === mode ? colors.glowPrimary : 'none'
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
        <div style={{ display: 'grid', gridTemplateColumns: selectedDriver ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDrivers.length === 0 ? (
              <div style={{ ...styles.card, textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>🚗</div>
                <div style={{ fontSize: '18px', color: colors.text, fontWeight: '600', marginBottom: '8px' }}>
                  לא נמצאו נהגים
                </div>
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  נסה לשנות את הסינון או החיפוש
                </div>
              </div>
            ) : (
              filteredDrivers.map(driver => (
                <div
                  key={driver.profile.user_id}
                  onClick={() => {
                    setSelectedDriver(driver);
                    telegram.hapticFeedback('selection');
                  }}
                  style={{
                    ...styles.card,
                    cursor: 'pointer',
                    background: selectedDriver?.profile.user_id === driver.profile.user_id
                      ? colors.gradientCard
                      : colors.secondary,
                    border: `2px solid ${selectedDriver?.profile.user_id === driver.profile.user_id
                      ? colors.accent
                      : colors.cardBorder}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: driver.isOnline ? colors.gradientSuccess : colors.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        border: `2px solid ${driver.isOnline ? colors.success : colors.cardBorder}`
                      }}>
                        🚗
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                          {driver.user?.name || driver.profile.user_id}
                        </div>
                        <div style={{ fontSize: '13px', color: colors.muted }}>
                          {driver.profile.vehicle_type || 'לא צוין'} • {driver.profile.vehicle_plate || 'אין'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: driver.isOnline ? `${colors.success}20` : `${colors.error}20`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: driver.isOnline ? colors.success : colors.error
                    }}>
                      {driver.isOnline ? '🟢 מקוון' : '⚫ לא מקוון'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      flex: 1,
                      padding: '10px',
                      background: colors.background,
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.info }}>
                        {driver.stats.active_orders}
                      </div>
                      <div style={{ fontSize: '11px', color: colors.muted }}>משלוחים פעילים</div>
                    </div>
                    <div style={{
                      flex: 1,
                      padding: '10px',
                      background: colors.background,
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.gold }}>
                        {driver.profile.rating.toFixed(1)}⭐
                      </div>
                      <div style={{ fontSize: '11px', color: colors.muted }}>דירוג</div>
                    </div>
                    <div style={{
                      flex: 1,
                      padding: '10px',
                      background: colors.background,
                      borderRadius: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.success }}>
                        {driver.stats.completed_today}
                      </div>
                      <div style={{ fontSize: '11px', color: colors.muted }}>היום</div>
                    </div>
                  </div>

                  {driver.user?.phone && (
                    <div style={{ fontSize: '13px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📞 {driver.user.phone}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {selectedDriver && (
            <DriverDetailPanel
              driver={selectedDriver}
              onClose={() => setSelectedDriver(null)}
              onUpdate={loadDrivers}
              dataStore={dataStore}
              driverService={driverService}
            />
          )}
        </div>
      )}

      {viewMode === 'map' && (
        <DriverMapView
          drivers={filteredDrivers}
          onDriverSelect={setSelectedDriver}
          selectedDriver={selectedDriver}
        />
      )}

      {viewMode === 'analytics' && (
        <DriverPerformanceChart
          drivers={filteredDrivers}
        />
      )}
    </div>
  );
}
