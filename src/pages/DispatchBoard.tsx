import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Truck, Map, Package, Clock, Radio, RefreshCw, List, LayoutGrid, X, MapPin, Phone, DollarSign, CheckCircle, AlertCircle, Timer } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import {
  DataStore,
  DriverStatusRecord,
  Order,
  ZoneCoverageSnapshot
} from '../data/types';
import { Toast } from '../components/Toast';
import { DispatchOrchestrator, ZoneCoverageResult } from '../lib/dispatchOrchestrator';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundStatCard,
  UndergroundHeader,
  UndergroundLoadingSpinner,
  UndergroundButton,
  UndergroundEmptyState,
  UndergroundBadge
} from '../components/underground';

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

    if (!supabase) {
      logger.warn('⚠️ Supabase client not available, realtime updates disabled. Using polling fallback.');

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
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner size="lg" centered />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      <UndergroundHeader
        title={translations.dispatchBoardPage.title}
        subtitle={translations.dispatchBoardPage.subtitle}
        icon={<Radio size={32} />}
        gradient
      />

      <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, marginBottom: undergroundTheme.spacing.xl, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: undergroundTheme.spacing.sm,
          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
          background: `${undergroundTheme.colors.status.success}20`,
          borderRadius: undergroundTheme.borderRadius.full,
          border: `1px solid ${undergroundTheme.colors.status.success}50`
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: undergroundTheme.colors.status.success,
            boxShadow: `0 0 12px ${undergroundTheme.colors.status.success}`,
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: undergroundTheme.typography.fontSize.xs, color: undergroundTheme.colors.status.success, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>
            {translations.dispatchBoardPage.realTime}
          </span>
        </div>
        <UndergroundButton
          onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
          variant="secondary"
        >
          {viewMode === 'kanban' ? <List size={16} /> : <LayoutGrid size={16} />}
          <span style={{ marginLeft: undergroundTheme.spacing.xs }}>
            {viewMode === 'kanban' ? translations.dispatchBoardPage.list : translations.dispatchBoardPage.kanban}
          </span>
        </UndergroundButton>
        <UndergroundButton onClick={handleRefresh} variant="secondary">
          <RefreshCw size={16} />
          <span style={{ marginLeft: undergroundTheme.spacing.xs }}>{translations.dispatchBoardPage.refresh}</span>
        </UndergroundButton>
      </div>

      {error && (
        <UndergroundCard variant="medium" style={{ marginBottom: undergroundTheme.spacing.xl }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: undergroundTheme.spacing.md,
            color: undergroundTheme.colors.status.error
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </UndergroundCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: undergroundTheme.spacing.lg, marginBottom: undergroundTheme.spacing.xl }}>
        <UndergroundStatCard
          icon={<Truck size={28} />}
          label={translations.dispatchBoardPage.availableDrivers}
          value={totalOnline.toString()}
          accentColor={undergroundTheme.colors.status.success}
        />
        <UndergroundStatCard
          icon={<Map size={28} />}
          label={translations.dispatchBoardPage.coverageZones}
          value={zones.length.toString()}
          accentColor={undergroundTheme.colors.accent.secondary}
        />
        <UndergroundStatCard
          icon={<Package size={28} />}
          label={translations.dispatchBoardPage.inDelivery}
          value={activeDeliveries.toString()}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon={<Clock size={28} />}
          label={translations.dispatchBoardPage.waiting}
          value={pendingAssignments.toString()}
          accentColor={undergroundTheme.colors.status.warning}
        />
      </div>

      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing.xl
        }}>
          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                {translations.dispatchBoardPage.waitingForAssignment}
              </h3>
              <UndergroundBadge>
                {getOrdersByStatus('pending').length}
              </UndergroundBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
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
                <UndergroundEmptyState
                  icon={<CheckCircle size={48} />}
                  title={translations.dispatchBoardPage.noWaitingOrders}
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                {translations.dispatchBoardPage.assigned}
              </h3>
              <UndergroundBadge>
                {getOrdersByStatus('assigned').length}
              </UndergroundBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {getOrdersByStatus('assigned').map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('assigned').length === 0 && (
                <UndergroundEmptyState
                  icon={<Timer size={48} />}
                  title={translations.dispatchBoardPage.noAssignedOrders}
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                {translations.dispatchBoardPage.inProgress}
              </h3>
              <UndergroundBadge>
                {getOrdersByStatus('in_progress').length}
              </UndergroundBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {getOrdersByStatus('in_progress').map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('in_progress').length === 0 && (
                <UndergroundEmptyState
                  icon={<Package size={48} />}
                  title={translations.dispatchBoardPage.noDeliveriesInProgress}
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                {translations.dispatchBoardPage.completed}
              </h3>
              <UndergroundBadge glow>
                {getOrdersByStatus('completed').length}
              </UndergroundBadge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {getOrdersByStatus('completed').slice(0, 5).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {getOrdersByStatus('completed').length === 0 && (
                <UndergroundEmptyState
                  icon={<CheckCircle size={48} />}
                  title={translations.dispatchBoardPage.noCompletedOrders}
                  description=""
                />
              )}
            </div>
          </UndergroundCard>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
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

      {showDriverSelector && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: undergroundTheme.spacing.xl
        }}>
          <UndergroundCard variant="strong" style={{
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.xl }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.xl, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
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
                  color: undergroundTheme.colors.text.secondary,
                  cursor: 'pointer',
                  padding: undergroundTheme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: undergroundTheme.borderRadius.md,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={24} />
              </button>
            </div>

            <UndergroundCard variant="light" style={{ marginBottom: undergroundTheme.spacing.xl }}>
              <div style={{ fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.sm }}>
                {selectedOrder.customer_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary }}>
                <MapPin size={14} />
                {selectedOrder.customer_address}
              </div>
            </UndergroundCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').map(driver => (
                <UndergroundCard
                  key={driver.driver_id}
                  variant="medium"
                  hover
                  onClick={() => handleAssignDriver(selectedOrder.id, driver.driver_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: undergroundTheme.typography.fontSize.base, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.xs }}>
                        {translations.dispatchBoardPage.driver} #{driver.driver_id}
                      </div>
                      <div style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.status.success }}>
                        {translations.dispatchBoardPage.available}
                      </div>
                    </div>
                    <Truck size={24} style={{ color: undergroundTheme.colors.accent.primary }} />
                  </div>
                </UndergroundCard>
              ))}
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').length === 0 && (
                <UndergroundEmptyState
                  icon={<Truck size={48} />}
                  title={translations.dispatchBoardPage.noAvailableDrivers}
                  description=""
                />
              )}
            </div>
          </UndergroundCard>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAssign }: {
  order: Order;
  onAssign?: () => void;
}) {
  const { t: translations } = useLanguage();

  return (
    <UndergroundCard variant="light" style={{ transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: undergroundTheme.spacing.md }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: undergroundTheme.typography.fontSize.base, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.xs }}>
            {order.customer_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary, marginBottom: undergroundTheme.spacing.xs }}>
            <MapPin size={14} />
            {order.customer_address}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary }}>
            <Phone size={14} />
            {order.customer_phone}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: undergroundTheme.spacing.xs,
          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
          background: undergroundTheme.colors.glassmorphism.medium,
          borderRadius: undergroundTheme.borderRadius.md,
          color: undergroundTheme.colors.accent.primary,
          fontSize: undergroundTheme.typography.fontSize.sm,
          fontWeight: undergroundTheme.typography.fontWeight.semibold,
          boxShadow: undergroundTheme.shadows.glow.cyan
        }}>
          <DollarSign size={14} />
          ₪{order.total_amount.toLocaleString()}
        </div>
      </div>

      {order.assigned_driver && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: undergroundTheme.spacing.xs,
          padding: undergroundTheme.spacing.sm,
          background: `${undergroundTheme.colors.status.success}20`,
          borderRadius: undergroundTheme.borderRadius.md,
          fontSize: undergroundTheme.typography.fontSize.sm,
          color: undergroundTheme.colors.status.success,
          marginBottom: undergroundTheme.spacing.md
        }}>
          <Truck size={16} />
          {translations.dispatchBoardPage.driver}: {order.assigned_driver}
        </div>
      )}

      {onAssign && (
        <UndergroundButton onClick={onAssign} variant="primary" fullWidth>
          {translations.dispatchBoardPage.assignDriver}
        </UndergroundButton>
      )}
    </UndergroundCard>
  );
}
