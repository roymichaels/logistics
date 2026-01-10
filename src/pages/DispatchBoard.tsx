import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Truck, Map, Package, Clock, Radio, RefreshCw, List, LayoutGrid, X, MapPin, Phone, DollarSign, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSafeAppServices } from '../context/AppServicesContext';
import { Toast } from '../components/Toast';
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

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  customer_id: string;
  business_id: string;
  total_amount: number;
  status: OrderStatus;
  assigned_driver?: string | null;
  customer_address?: string;
  customer_phone?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

interface DriverStatus {
  id: string;
  driver_id: string;
  status: 'available' | 'busy' | 'offline';
  current_zone_id?: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
}

interface Zone {
  id: string;
  name: string;
  business_id: string;
}

type ViewMode = 'kanban' | 'list';
type KanbanStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

export function DispatchBoard() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [zones, setZones] = useState<Zone[]>([]);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const loadData = useCallback(async () => {
    if (!currentBusinessId) {
      setLoading(false);
      return;
    }

    try {
      const [
        { data: zonesData, error: zonesError },
        { data: driversData, error: driversError },
        { data: ordersData, error: ordersError }
      ] = await Promise.all([
        supabase
          .from('zones')
          .select('*')
          .eq('business_id', currentBusinessId),
        supabase
          .from('driver_statuses')
          .select('*, profiles(full_name)')
          .eq('status', 'available')
          .order('updated_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*, profiles(full_name, phone)')
          .eq('business_id', currentBusinessId)
          .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (zonesError) throw zonesError;
      if (driversError) throw driversError;
      if (ordersError) throw ordersError;

      setZones(zonesData || []);
      setDrivers(driversData || []);
      setOrders(ordersData || []);
      setError(null);

      logger.info('[DispatchBoard] Data loaded successfully', {
        zones: zonesData?.length || 0,
        drivers: driversData?.length || 0,
        orders: ordersData?.length || 0
      });
    } catch (err) {
      logger.error('[DispatchBoard] Failed to load data:', err);
      setError('Failed to load dispatch data');
      Toast.error('Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadData();

    if (!currentBusinessId) return;

    const ordersChannel = supabase
      .channel(`dispatch-orders-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${currentBusinessId}`
        },
        () => {
          logger.info('[DispatchBoard] Order update detected');
          loadData();
        }
      )
      .subscribe();

    const driversChannel = supabase
      .channel(`dispatch-drivers-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_statuses'
        },
        () => {
          logger.info('[DispatchBoard] Driver status update detected');
          loadData();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      ordersChannel.unsubscribe();
      driversChannel.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [loadData, currentBusinessId]);

  const availableDrivers = drivers.filter(d => d.status === 'available');
  const activeDeliveries = orders.filter(o => o.status === 'out_for_delivery').length;
  const pendingOrders = orders.filter(o => !o.assigned_driver && o.status !== 'delivered' && o.status !== 'cancelled').length;

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    haptic('soft');
  };

  const getOrdersByStatus = (status: KanbanStatus): Order[] => {
    switch (status) {
      case 'pending':
        return orders.filter(o => !o.assigned_driver && o.status !== 'delivered' && o.status !== 'cancelled');
      case 'assigned':
        return orders.filter(o => o.assigned_driver && o.status === 'confirmed');
      case 'in_progress':
        return orders.filter(o => o.status === 'out_for_delivery' || o.status === 'preparing' || o.status === 'ready');
      case 'completed':
        return orders.filter(o => o.status === 'delivered');
      default:
        return [];
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ assigned_driver: driverId })
        .eq('id', orderId);

      if (error) throw error;

      Toast.success('Driver assigned successfully');
      setSelectedOrder(null);
      setShowDriverSelector(false);
      await loadData();
    } catch (error) {
      logger.error('[DispatchBoard] Failed to assign driver:', error);
      Toast.error('Failed to assign driver');
    }
  };

  if (!currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundEmptyState
          title="No Business Context"
          message="Please select a business to view dispatch board"
        />
      </div>
    );
  }

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
        title="Dispatch Control Center"
        subtitle="Real-time order assignment and driver coordination"
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
            Real-Time Updates
          </span>
        </div>
        <UndergroundButton
          onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
          variant="secondary"
        >
          {viewMode === 'kanban' ? <List size={16} /> : <LayoutGrid size={16} />}
          <span style={{ marginLeft: undergroundTheme.spacing.xs }}>
            {viewMode === 'kanban' ? 'List View' : 'Kanban View'}
          </span>
        </UndergroundButton>
        <UndergroundButton onClick={handleRefresh} variant="secondary">
          <RefreshCw size={16} />
          <span style={{ marginLeft: undergroundTheme.spacing.xs }}>Refresh</span>
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
          label="Available Drivers"
          value={availableDrivers.length.toString()}
          accentColor={undergroundTheme.colors.status.success}
        />
        <UndergroundStatCard
          icon={<Map size={28} />}
          label="Coverage Zones"
          value={zones.length.toString()}
          accentColor={undergroundTheme.colors.accent.secondary}
        />
        <UndergroundStatCard
          icon={<Package size={28} />}
          label="Active Deliveries"
          value={activeDeliveries.toString()}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon={<Clock size={28} />}
          label="Pending Orders"
          value={pendingOrders.toString()}
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
                Waiting for Assignment
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
                  title="No Waiting Orders"
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                Assigned
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
                  title="No Assigned Orders"
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                In Progress
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
                  title="No Deliveries in Progress"
                  description=""
                />
              )}
            </div>
          </UndergroundCard>

          <UndergroundCard variant="medium" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: undergroundTheme.spacing.lg }}>
              <h3 style={{ margin: 0, fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.bold, color: undergroundTheme.colors.text.primary }}>
                Completed
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
                  title="No Completed Orders"
                  description=""
                />
              )}
            </div>
          </UndergroundCard>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAssign={!order.assigned_driver ? () => {
                setSelectedOrder(order);
                setShowDriverSelector(true);
              } : undefined}
            />
          ))}
          {orders.length === 0 && (
            <UndergroundEmptyState
              title="No Orders"
              message="No orders available for dispatch"
            />
          )}
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
                Assign Driver to Order
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
                {selectedOrder.profiles?.full_name || 'Customer'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary }}>
                <MapPin size={14} />
                {selectedOrder.customer_address || 'No address'}
              </div>
            </UndergroundCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {availableDrivers.map(driver => (
                <UndergroundCard
                  key={driver.driver_id}
                  variant="medium"
                  hover
                  onClick={() => handleAssignDriver(selectedOrder.id, driver.driver_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: undergroundTheme.typography.fontSize.base, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.xs }}>
                        {driver.profiles?.full_name || `Driver #${driver.driver_id}`}
                      </div>
                      <div style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.status.success }}>
                        Available
                      </div>
                    </div>
                    <Truck size={24} style={{ color: undergroundTheme.colors.accent.primary }} />
                  </div>
                </UndergroundCard>
              ))}
              {availableDrivers.length === 0 && (
                <UndergroundEmptyState
                  icon={<Truck size={48} />}
                  title="No Available Drivers"
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
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <UndergroundCard variant="light" style={{ transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: undergroundTheme.spacing.md }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: undergroundTheme.typography.fontSize.base, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.xs }}>
            {order.profiles?.full_name || 'Customer'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary, marginBottom: undergroundTheme.spacing.xs }}>
            <MapPin size={14} />
            {order.customer_address || 'No address'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs, fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary }}>
            <Phone size={14} />
            {order.profiles?.phone || order.customer_phone || 'No phone'}
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
          {formatCurrency(order.total_amount)}
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
          Driver: {order.assigned_driver}
        </div>
      )}

      {onAssign && (
        <UndergroundButton onClick={onAssign} variant="primary" fullWidth>
          Assign Driver
        </UndergroundButton>
      )}
    </UndergroundCard>
  );
}
