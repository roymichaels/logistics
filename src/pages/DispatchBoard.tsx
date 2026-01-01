import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useLanguage } from '../context/LanguageContext';
import {
  DataStore,
  DriverStatusRecord,
  Order,
  ZoneCoverageSnapshot
} from '../data/types';
import { Toast } from '../components/Toast';
import { DispatchOrchestrator, ZoneCoverageResult } from '../lib/dispatchOrchestrator';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ContentCard } from '../components/layout/ContentCard';
import { tokens, styles } from '../styles/tokens';

import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface DispatchBoardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

export function DispatchBoard({ dataStore }: DispatchBoardProps) {

  const { t: translations, isRTL } = useLanguage();
  const [zones, setZones] = useState<ZoneCoverageSnapshot[]>([]);
  const [unassignedDrivers, setUnassignedDrivers] = useState<DriverStatusRecord[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const orchestrator = useMemo(() => new DispatchOrchestrator(dataStore), [dataStore]);

  const loadData = useCallback(async () => {
    if (!dataStore.listDriverStatuses) {
      setError(translations.dispatchBoardPage.systemNotSupported);
      setLoading(false);
      return;
    }

    try {
      const snapshot: ZoneCoverageResult = await orchestrator.getCoverage();
      setZones(snapshot.coverage);
      setUnassignedDrivers(snapshot.unassignedDrivers);
      setOutstandingOrders(snapshot.outstandingOrders);
      setError(null);
    } catch (err) {
      logger.error('Failed to load dispatch data', err);
      setError(translations.dispatchBoardPage.errorLoadingCoverage);
      Toast.error(translations.dispatchBoardPage.errorLoadingCoverage);
    } finally {
      setLoading(false);
    }
  }, [dataStore, orchestrator]);

  useEffect(() => {
    loadData();

    const supabase = (dataStore as any)?.supabase;

    // Set up Supabase Realtime for live updates only if supabase is available
    if (!supabase) {
      logger.warn('⚠️ Supabase client not available, realtime updates disabled. Using polling fallback.');

      // Fallback to polling only
      const interval = setInterval(() => {
        loadData();
      }, 30000);

      return () => {
        clearInterval(interval);
      };
    }

    let ordersChannel: any = null;
    let driversChannel: any = null;

    try {
      ordersChannel = supabase
        .channel('dispatch-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            logger.info('Order update detected, refreshing...');
            loadData();
          }
        )
        .subscribe();

      driversChannel = supabase
        .channel('dispatch-drivers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_statuses'
          },
          () => {
            logger.info('Driver status update detected, refreshing...');
            loadData();
          }
        )
        .subscribe();
    } catch (err) {
      logger.error('Failed to setup realtime subscriptions:', err);
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      try {
        if (ordersChannel) ordersChannel.unsubscribe();
        if (driversChannel) driversChannel.unsubscribe();
      } catch (err) {
        logger.error('Error unsubscribing from channels:', err);
      }
      clearInterval(interval);
    };
  }, [loadData, dataStore]);

  const totalOnline = zones.reduce((sum, zone) => sum + zone.onlineDrivers.length, 0);
  const activeDeliveries = outstandingOrders.filter((order) => order.status === 'out_for_delivery').length;
  const pendingAssignments = outstandingOrders.filter((order) => order.status !== 'out_for_delivery').length;

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    haptic('soft');
  };

  const getOrdersByStatus = (status: OrderStatus): Order[] => {
    switch (status) {
      case 'pending':
        return outstandingOrders.filter(o => !o.assigned_driver && o.status !== 'delivered' && o.status !== 'cancelled');
      case 'assigned':
        return outstandingOrders.filter(o => o.assigned_driver && o.status === 'confirmed');
      case 'in_progress':
        return outstandingOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'preparing' || o.status === 'ready');
      case 'completed':
        return outstandingOrders.filter(o => o.status === 'delivered');
      default:
        return [];
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await dataStore.updateOrder?.(orderId, { assigned_driver: driverId });

      Toast.success(translations.dispatchBoardPage.driverAssignedSuccessfully);
      setSelectedOrder(null);
      setShowDriverSelector(false);
      await loadData();
    } catch (error) {
      logger.error('Failed to assign driver:', error);
      Toast.error(translations.dispatchBoardPage.errorAssigningDriver);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
          <div style={{ color: tokens.colors.text.secondary }}>{translations.dispatchBoardPage.loadingDispatchBoard}</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📡"
        title={translations.dispatchBoardPage.title}
        subtitle={translations.dispatchBoardPage.subtitle}
        actionButton={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: `${tokens.colors.status.success}20`,
              borderRadius: '20px',
              border: `1px solid ${tokens.colors.status.success}50`
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: tokens.colors.status.success,
                boxShadow: `0 0 8px ${tokens.colors.status.success}`,
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: '12px', color: tokens.colors.status.success, fontWeight: '600' }}>
                {translations.dispatchBoardPage.realTime}
              </span>
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
              style={styles.button.secondary}
            >
              {viewMode === 'kanban' ? translations.dispatchBoardPage.list : translations.dispatchBoardPage.kanban}
            </button>
            <button onClick={handleRefresh} style={styles.button.secondary}>
              🔄 {translations.dispatchBoardPage.refresh}
            </button>
          </div>
        }
      />

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      {error && (
        <ContentCard style={{ marginBottom: '20px' }}>
          <div style={{
            padding: '4px 0',
            color: tokens.colors.status.error,
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        </ContentCard>
      )}

      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <ContentCard hoverable onClick={() => console.log('Show available drivers')} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚗</div>
          <div style={{ ...styles.stat.value, fontSize: '28px', color: tokens.colors.status.success }}>{totalOnline}</div>
          <div style={styles.stat.label}>{translations.dispatchBoardPage.availableDrivers}</div>
        </ContentCard>
        <ContentCard hoverable onClick={() => console.log('Show zone details')} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ ...styles.stat.value, fontSize: '28px', color: tokens.colors.status.info }}>{zones.length}</div>
          <div style={styles.stat.label}>{translations.dispatchBoardPage.coverageZones}</div>
        </ContentCard>
        <ContentCard hoverable onClick={() => console.log('Filter to active deliveries')} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚚</div>
          <div style={{ ...styles.stat.value, fontSize: '28px', color: tokens.colors.brand.primary }}>{activeDeliveries}</div>
          <div style={styles.stat.label}>{translations.dispatchBoardPage.inDelivery}</div>
        </ContentCard>
        <ContentCard hoverable onClick={() => console.log('Filter to pending assignments')} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ ...styles.stat.value, fontSize: '28px', color: tokens.colors.status.warning }}>{pendingAssignments}</div>
          <div style={styles.stat.label}>{translations.dispatchBoardPage.waiting}</div>
        </ContentCard>
      </div>

      {/* Kanban Board or List View */}
      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Pending Column */}
          <ContentCard style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: tokens.colors.text.primary }}>
                {translations.dispatchBoardPage.waitingForAssignment}
              </h3>
              <div style={{
                padding: '6px 12px',
                background: tokens.gradients.primary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright
              }}>
                {getOrdersByStatus('pending').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('pending').map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAssign={() => {
                    setSelectedOrder(order);
                    setShowDriverSelector(true);
                  }}
                />
              ))}
              {getOrdersByStatus('pending').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: tokens.colors.text.secondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>✅</div>
                  <div style={{ fontSize: '14px' }}>{translations.dispatchBoardPage.noWaitingOrders}</div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Assigned Column */}
          <ContentCard style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: tokens.colors.text.primary }}>
                {translations.dispatchBoardPage.assigned}
              </h3>
              <div style={{
                padding: '6px 12px',
                background: tokens.gradients.primary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright
              }}>
                {getOrdersByStatus('assigned').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('assigned').map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('assigned').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: tokens.colors.text.secondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📎</div>
                  <div style={{ fontSize: '14px' }}>{translations.dispatchBoardPage.noAssignedOrders}</div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* In Progress Column */}
          <ContentCard style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: tokens.colors.text.primary }}>
                {translations.dispatchBoardPage.inProgress}
              </h3>
              <div style={{
                padding: '6px 12px',
                background: tokens.gradients.primary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright
              }}>
                {getOrdersByStatus('in_progress').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('in_progress').map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('in_progress').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: tokens.colors.text.secondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🚦</div>
                  <div style={{ fontSize: '14px' }}>{translations.dispatchBoardPage.noDeliveriesInProgress}</div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Completed Column */}
          <ContentCard style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: tokens.colors.text.primary }}>
                {translations.dispatchBoardPage.completed}
              </h3>
              <div style={{
                padding: '6px 12px',
                background: tokens.gradients.success,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright
              }}>
                {getOrdersByStatus('completed').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('completed').slice(0, 5).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('completed').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: tokens.colors.text.secondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
                  <div style={{ fontSize: '14px' }}>{translations.dispatchBoardPage.noCompletedOrders}</div>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {outstandingOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAssign={!order.assigned_driver ? () => {
                setSelectedOrder(order);
                setShowDriverSelector(true);
              } : undefined}
            />
          ))}
        </div>
      )}

      {/* Driver Availability Sidebar */}
      {showDriverSelector && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <ContentCard style={{
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tokens.colors.text.primary }}>
                {translations.dispatchBoardPage.assignDriverToOrder}
              </h3>
              <button
                onClick={() => {
                  setShowDriverSelector(false);
                  setSelectedOrder(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tokens.colors.text.secondary,
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Order Info */}
            <div style={{
              padding: '16px',
              background: tokens.colors.background.secondary,
              borderRadius: '12px',
              marginBottom: '20px',
              border: `1px solid ${tokens.colors.background.cardBorder}`
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.text.primary, marginBottom: '8px' }}>
                {selectedOrder.customer_name}
              </div>
              <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                📍 {selectedOrder.customer_address}
              </div>
            </div>

            {/* Available Drivers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').map(driver => (
                <ContentCard
                  key={driver.driver_id}
                  hoverable
                  onClick={() => handleAssignDriver(selectedOrder.id, driver.driver_id)}
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  <div style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.text.primary, marginBottom: '4px' }}>
                    {translations.dispatchBoardPage.driver} #{driver.driver_id}
                  </div>
                  <div style={{ fontSize: '13px', color: tokens.colors.status.success }}>
                    {translations.dispatchBoardPage.available}
                  </div>
                </ContentCard>
              ))}
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: tokens.colors.text.secondary }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚫</div>
                  <div>{translations.dispatchBoardPage.noAvailableDrivers}</div>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      )}
    </PageContainer>
  );
}

// Order Card Component
function OrderCard({ order, onAssign }: {
  order: Order;
  onAssign?: () => void;
}) {
  const { t: translations } = useLanguage();

  return (
    <div style={{
      padding: '16px',
      background: tokens.colors.background.secondary,
      border: `1px solid ${tokens.colors.background.cardBorder}`,
      borderRadius: '12px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.text.primary, marginBottom: '4px' }}>
            {order.customer_name}
          </div>
          <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
            📍 {order.customer_address}
          </div>
          <div style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>
            📞 {order.customer_phone}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: `${tokens.colors.brand.primary}20`,
          border: `1px solid ${tokens.colors.brand.primary}50`,
          borderRadius: '8px',
          color: tokens.colors.brand.primary,
          fontSize: '12px',
          fontWeight: '600'
        }}>
          ₪{order.total_amount.toLocaleString()}
        </div>
      </div>

      {order.assigned_driver && (
        <div style={{
          padding: '8px 12px',
          background: `${tokens.colors.status.success}15`,
          borderRadius: '8px',
          fontSize: '13px',
          color: tokens.colors.status.success,
          marginBottom: '12px'
        }}>
          🚗 {translations.dispatchBoardPage.driver}: {order.assigned_driver}
        </div>
      )}

      {onAssign && (
        <button
          onClick={onAssign}
          style={styles.button.primary}
        >
          {translations.dispatchBoardPage.assignDriver}
        </button>
      )}
    </div>
  );
}
