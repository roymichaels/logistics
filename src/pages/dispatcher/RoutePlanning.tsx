import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundSelect,
  UndergroundHeader,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundEmptyState
} from '../../components/underground';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';
import { Toast } from '../../components/Toast';
import { useSafeAppServices } from '../../context/AppServicesContext';

interface Driver {
  id: string;
  user_id: string;
  status: string;
  profiles?: {
    full_name?: string;
  };
}

interface Zone {
  id: string;
  name: string;
  coordinates?: any;
}

interface Order {
  id: string;
  order_number: string;
  delivery_address: string;
  customer_name?: string;
  total_amount: number;
  priority: 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  zone_id?: string;
}

interface Assignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  orders?: Order;
}

export function RoutePlanning() {
  const appServices = useSafeAppServices();
  const businessId = appServices?.currentBusinessId;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      loadAllData();

      const ordersChannel = supabase
        .channel('route-planning-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `business_id=eq.${businessId}`
          },
          () => {
            logger.info('[RoutePlanning] Order update detected');
            loadPendingOrders();
          }
        )
        .subscribe();

      const assignmentsChannel = supabase
        .channel('route-planning-assignments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignments'
          },
          () => {
            logger.info('[RoutePlanning] Assignment update detected');
            loadAssignments();
          }
        )
        .subscribe();

      return () => {
        ordersChannel.unsubscribe();
        assignmentsChannel.unsubscribe();
      };
    }
  }, [businessId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDrivers(),
        loadZones(),
        loadPendingOrders(),
        loadAssignments()
      ]);
    } catch (error) {
      logger.error('[RoutePlanning] Failed to load data:', error);
      Toast.error('Failed to load route planning data');
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      let query = supabase
        .from('driver_profiles')
        .select(`
          id,
          user_id,
          status,
          profiles:user_id (
            full_name
          )
        `)
        .eq('active', true)
        .in('status', ['available', 'online', 'busy']);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[RoutePlanning] Failed to load drivers:', error);
        return;
      }

      setDrivers(data || []);
    } catch (error) {
      logger.error('[RoutePlanning] Exception loading drivers:', error);
    }
  };

  const loadZones = async () => {
    try {
      let query = supabase
        .from('zones')
        .select('id, name, coordinates')
        .eq('active', true)
        .order('name');

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[RoutePlanning] Failed to load zones:', error);
        return;
      }

      setZones(data || []);
    } catch (error) {
      logger.error('[RoutePlanning] Exception loading zones:', error);
    }
  };

  const loadPendingOrders = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready_for_delivery'])
        .is('driver_id', null)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('[RoutePlanning] Failed to load pending orders:', error);
        return;
      }

      const ordersWithPriority = (data || []).map(order => ({
        ...order,
        priority: calculatePriority(order) as 'high' | 'medium' | 'low'
      }));

      setPendingOrders(ordersWithPriority);
    } catch (error) {
      logger.error('[RoutePlanning] Exception loading pending orders:', error);
    }
  };

  const loadAssignments = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          order_id,
          driver_id,
          status,
          orders (
            id,
            order_number,
            delivery_address,
            customer_name,
            total_amount,
            status,
            created_at
          )
        `)
        .in('status', ['assigned', 'accepted', 'picked_up', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('[RoutePlanning] Failed to load assignments:', error);
        return;
      }

      setAssignments(data || []);
    } catch (error) {
      logger.error('[RoutePlanning] Exception loading assignments:', error);
    }
  };

  const calculatePriority = (order: any): string => {
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const hoursSinceOrder = orderAge / (1000 * 60 * 60);

    if (hoursSinceOrder > 2 || order.status === 'ready_for_delivery') {
      return 'high';
    } else if (hoursSinceOrder > 1) {
      return 'medium';
    }
    return 'low';
  };

  const handleAssignOrder = async (orderId: string) => {
    if (!selectedDriver) {
      Toast.error('Please select a driver first');
      return;
    }

    try {
      setAssigningOrder(orderId);

      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          order_id: orderId,
          driver_id: selectedDriver,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        });

      if (assignmentError) {
        logger.error('[RoutePlanning] Failed to create assignment:', assignmentError);
        Toast.error('Failed to assign order');
        return;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          driver_id: selectedDriver,
          status: 'assigned'
        })
        .eq('id', orderId);

      if (orderError) {
        logger.error('[RoutePlanning] Failed to update order:', orderError);
      }

      Toast.success('Order assigned successfully!');
      await loadAllData();
    } catch (error) {
      logger.error('[RoutePlanning] Exception assigning order:', error);
      Toast.error('Failed to assign order');
    } finally {
      setAssigningOrder(null);
    }
  };

  const filteredPendingOrders = useMemo(() => {
    if (selectedZone === 'all') return pendingOrders;
    return pendingOrders.filter(order => order.zone_id === selectedZone);
  }, [pendingOrders, selectedZone]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return undergroundTheme.colors.status.error;
      case 'medium': return undergroundTheme.colors.status.warning;
      case 'low': return undergroundTheme.colors.status.info;
      default: return undergroundTheme.colors.text.tertiary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const calculateEstimatedTime = (order: Order) => {
    const baseTime = 15;
    const priorityTime = order.priority === 'high' ? 5 : order.priority === 'medium' ? 10 : 15;
    return `${baseTime + priorityTime} min`;
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
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        title="🗺️ Route Planning"
        subtitle="Plan and optimize delivery routes for drivers"
      />

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <UndergroundCard>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: undergroundTheme.spacing.lg,
            alignItems: 'end'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold
              }}>
                Assign to Driver
              </label>
              <UndergroundSelect
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
              >
                <option value="">Select a driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.profiles?.full_name || driver.user_id} ({driver.status})
                  </option>
                ))}
              </UndergroundSelect>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold
              }}>
                Filter by Zone
              </label>
              <UndergroundSelect
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="all">All Zones</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </UndergroundSelect>
            </div>

            <UndergroundButton
              variant="primary"
              fullWidth
              onClick={() => {
                loadAllData();
                Toast.info('Route data refreshed');
              }}
            >
              🔄 Refresh Routes
            </UndergroundButton>
          </div>
        </UndergroundCard>
      </UndergroundSection>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: undergroundTheme.spacing['2xl'],
        marginTop: undergroundTheme.spacing['3xl']
      }}>
        <UndergroundCard>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing['2xl']
          }}>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              textShadow: undergroundTheme.shadows.glow.cyan
            }}>
              📦 Pending Deliveries
            </h2>
            <span style={{
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
              background: `${undergroundTheme.colors.status.warning}20`,
              color: undergroundTheme.colors.status.warning,
              borderRadius: undergroundTheme.borderRadius.lg,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              border: `1px solid ${undergroundTheme.colors.status.warning}40`,
              boxShadow: undergroundTheme.shadows.glow.amber
            }}>
              {filteredPendingOrders.length} orders
            </span>
          </div>

          {filteredPendingOrders.length === 0 ? (
            <UndergroundEmptyState
              icon="📦"
              title="No pending deliveries"
              description="All orders have been assigned or completed"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {filteredPendingOrders.map((order) => (
                <UndergroundCard
                  key={order.id}
                  variant="light"
                  hover
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: undergroundTheme.spacing.md
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: undergroundTheme.spacing.sm,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        <span style={{
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.text.tertiary,
                          fontFamily: 'monospace'
                        }}>
                          {order.order_number}
                        </span>
                        <span style={{ fontSize: '16px' }}>
                          {getPriorityIcon(order.priority)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {order.customer_name || 'Customer'}
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.secondary
                      }}>
                        📍 {order.delivery_address || 'No address'}
                      </div>
                    </div>
                    <div style={{
                      padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
                      background: `${getPriorityColor(order.priority)}20`,
                      color: getPriorityColor(order.priority),
                      borderRadius: undergroundTheme.borderRadius.md,
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      border: `1px solid ${getPriorityColor(order.priority)}40`,
                      boxShadow: `0 0 10px ${getPriorityColor(order.priority)}20`
                    }}>
                      {order.priority}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      ₪{order.total_amount.toFixed(2)} • ETA: {calculateEstimatedTime(order)}
                    </span>
                    <UndergroundButton
                      variant="primary"
                      size="small"
                      onClick={() => handleAssignOrder(order.id)}
                      disabled={!selectedDriver || assigningOrder === order.id}
                    >
                      {assigningOrder === order.id ? '⏳ Assigning...' : '✅ Assign'}
                    </UndergroundButton>
                  </div>
                </UndergroundCard>
              ))}
            </div>
          )}
        </UndergroundCard>

        <UndergroundCard>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing['2xl']
          }}>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              textShadow: undergroundTheme.shadows.glow.cyan
            }}>
              🚚 Assigned Routes
            </h2>
            <span style={{
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
              background: `${undergroundTheme.colors.status.info}20`,
              color: undergroundTheme.colors.status.info,
              borderRadius: undergroundTheme.borderRadius.lg,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              border: `1px solid ${undergroundTheme.colors.status.info}40`,
              boxShadow: undergroundTheme.shadows.glow.blue
            }}>
              {assignments.length} assignments
            </span>
          </div>

          {assignments.length === 0 ? (
            <UndergroundEmptyState
              icon="🚚"
              title="No active assignments"
              description="Assign orders to drivers to see them here"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {assignments.map((assignment, index) => {
                const order = assignment.orders;
                if (!order) return null;

                return (
                  <UndergroundCard
                    key={assignment.id}
                    variant="light"
                    hover
                  >
                    <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: undergroundTheme.colors.gradient.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.primary,
                        flexShrink: 0,
                        boxShadow: undergroundTheme.shadows.glow.cyan
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: undergroundTheme.spacing.sm
                        }}>
                          <div>
                            <div style={{
                              fontSize: undergroundTheme.typography.fontSize.xs,
                              fontWeight: undergroundTheme.typography.fontWeight.bold,
                              color: undergroundTheme.colors.text.tertiary,
                              marginBottom: undergroundTheme.spacing.xs,
                              fontFamily: 'monospace'
                            }}>
                              {order.order_number}
                            </div>
                            <div style={{
                              fontSize: undergroundTheme.typography.fontSize.lg,
                              fontWeight: undergroundTheme.typography.fontWeight.semibold,
                              color: undergroundTheme.colors.text.primary,
                              marginBottom: undergroundTheme.spacing.xs
                            }}>
                              {order.customer_name || 'Customer'}
                            </div>
                            <div style={{
                              fontSize: undergroundTheme.typography.fontSize.sm,
                              color: undergroundTheme.colors.text.secondary
                            }}>
                              📍 {order.delivery_address}
                            </div>
                          </div>
                          <div style={getStatusBadgeStyle(assignment.status)}>
                            {assignment.status.replace('_', ' ')}
                          </div>
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.tertiary
                        }}>
                          ₪{order.total_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </UndergroundCard>
                );
              })}
            </div>
          )}
        </UndergroundCard>
      </div>
    </div>
  );
}
