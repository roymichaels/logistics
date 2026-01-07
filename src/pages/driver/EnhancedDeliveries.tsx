import React, { useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { haptic } from '../../utils/haptic';
import { assignmentService, AssignmentWithOrder } from '../../services/assignments';
import { driverService } from '../../services/driver';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { DeliveryMap, DeliveryLocation } from '../../components/driver/DeliveryMap';
import { PhotoCapture } from '../../components/driver/PhotoCapture';
import { OrderPreviewModal } from '../../components/driver/OrderPreviewModal';
import { CustomerContact } from '../../components/driver/CustomerContact';
import { EarningsCounter } from '../../components/driver/EarningsCounter';
import { Button } from '../../components/atoms/Button';

export function EnhancedDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<AssignmentWithOrder[]>([]);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<AssignmentWithOrder | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDeliveries();
      loadTodayEarnings();

      const unsubscribe = assignmentService.subscribeToDriverAssignments(
        user.id,
        handleNewAssignment,
        handleAssignmentUpdate
      );

      return () => unsubscribe();
    }
  }, [user]);

  const loadDeliveries = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await assignmentService.getDriverActiveAssignments(user.id);

      if (error) {
        logger.error('[EnhancedDeliveries] Failed to load deliveries', error);
        Toast.error('Failed to load deliveries');
        return;
      }

      setDeliveries(data);
    } catch (error) {
      logger.error('[EnhancedDeliveries] Exception loading deliveries', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayEarnings = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await driverService.getDriverEarnings(user.id, today, today);

      if (data && data.length > 0) {
        setTodayEarnings(data[0].net_earnings);
      }
    } catch (error) {
      logger.error('[EnhancedDeliveries] Failed to load earnings', error);
    }
  };

  const handleNewAssignment = (assignment: any) => {
    logger.info('[EnhancedDeliveries] New assignment received', assignment);

    const assignmentWithOrder: AssignmentWithOrder = assignment;
    setPendingAssignment(assignmentWithOrder);

    haptic('success');

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Delivery Available!', {
        body: `Order #${assignmentWithOrder.order.order_number}`,
        icon: '/icon.png',
      });
    }
  };

  const handleAssignmentUpdate = (assignment: any) => {
    logger.info('[EnhancedDeliveries] Assignment updated', assignment);
    loadDeliveries();
  };

  const handleAcceptOrder = async () => {
    if (!pendingAssignment) return;

    try {
      setActionLoading(pendingAssignment.id);
      haptic('medium');

      const { error } = await assignmentService.acceptAssignment(pendingAssignment.id);

      if (error) {
        logger.error('[EnhancedDeliveries] Failed to accept assignment', error);
        Toast.error('Failed to accept order');
        return;
      }

      Toast.success('Order accepted!');
      haptic('success');
      setPendingAssignment(null);
      loadDeliveries();
    } catch (error) {
      logger.error('[EnhancedDeliveries] Exception accepting assignment', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineOrder = async (reason?: string) => {
    if (!pendingAssignment) return;

    logger.info('[EnhancedDeliveries] Order declined', { reason });
    haptic('light');
    setPendingAssignment(null);
    Toast.info('Order declined');
  };

  const handlePickup = async (assignmentId: string) => {
    try {
      setActionLoading(assignmentId);
      haptic('medium');

      const { error } = await assignmentService.markOrderPickedUp(assignmentId);

      if (error) {
        logger.error('[EnhancedDeliveries] Failed to mark as picked up', error);
        Toast.error('Failed to mark as picked up');
        return;
      }

      Toast.success('Marked as picked up!');
      haptic('success');
      loadDeliveries();
    } catch (error) {
      logger.error('[EnhancedDeliveries] Exception marking picked up', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartPhotoCapture = (assignmentId: string) => {
    setShowPhotoCapture(assignmentId);
  };

  const handlePhotoCapture = async (photoUrl: string) => {
    if (!showPhotoCapture) return;

    try {
      const { error } = await assignmentService.markOrderDelivered(showPhotoCapture, photoUrl);

      if (error) {
        logger.error('[EnhancedDeliveries] Failed to complete delivery', error);
        Toast.error('Failed to complete delivery');
        return;
      }

      Toast.success('Delivery completed!');
      haptic('success');
      setShowPhotoCapture(null);
      loadDeliveries();
      loadTodayEarnings();
    } catch (error) {
      logger.error('[EnhancedDeliveries] Exception completing delivery', error);
    }
  };

  const handleNavigate = (address: string) => {
    haptic('light');
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const handleLocationUpdate = async (lat: number, lng: number) => {
    setDriverLocation({ lat, lng });

    if (user?.id) {
      await driverService.updateDriverStatus(user.id, 'online', lat, lng);
    }
  };

  const activeDeliveries = deliveries.filter((d) =>
    ['assigned', 'accepted', 'picked_up'].includes(d.status)
  );

  const completedDeliveries = deliveries.filter((d) => d.status === 'delivered');

  const displayedDeliveries = filter === 'active' ? activeDeliveries : completedDeliveries;

  const deliveryLocations: DeliveryLocation[] = activeDeliveries
    .filter((d) => d.order.delivery_address)
    .map((d) => ({
      id: d.id,
      type: d.status === 'accepted' ? 'pickup' : 'dropoff',
      lat: 32.0853 + (Math.random() - 0.5) * 0.1,
      lng: 34.7818 + (Math.random() - 0.5) * 0.1,
      address: d.order.delivery_address!,
      name: d.order.customer_name || undefined,
      orderNumber: d.order.order_number,
      status: d.status,
    }));

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: tokens.colors.panel,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            Loading deliveries...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        paddingBottom: '100px',
      }}
    >
      <div
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          borderBottom: `1px solid ${tokens.colors.background.cardBorder}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#fff' }}>
            My Deliveries
          </h1>
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              color: tokens.colors.status.success,
            }}
          >
            {activeDeliveries.length} Active
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
            Today's Earnings
          </div>
          <EarningsCounter
            currentEarnings={todayEarnings}
            isAnimating={actionLoading !== null}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('active')}
            style={{
              flex: 1,
              padding: '12px',
              background: filter === 'active' ? tokens.gradients.primary : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Active ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            style={{
              flex: 1,
              padding: '12px',
              background: filter === 'completed' ? tokens.gradients.primary : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Completed ({completedDeliveries.length})
          </button>
        </div>
      </div>

      {activeDeliveries.length > 0 && (
        <div style={{ padding: '20px' }}>
          <DeliveryMap
            driverLocation={driverLocation}
            deliveries={deliveryLocations}
            height="300px"
            showRoute={true}
            onLocationUpdate={handleLocationUpdate}
          />
        </div>
      )}

      <div style={{ padding: '0 20px 20px' }}>
        {displayedDeliveries.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: tokens.colors.background.card,
              borderRadius: '20px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text, marginBottom: '8px' }}>
              {filter === 'active' ? 'No Active Deliveries' : 'No Completed Deliveries'}
            </div>
            <div style={{ fontSize: '15px', color: tokens.colors.subtle }}>
              {filter === 'active'
                ? 'New orders will appear here'
                : 'Your completed deliveries will show here'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayedDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                expanded={expandedDelivery === delivery.id}
                onToggleExpand={() => setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)}
                onPickup={() => handlePickup(delivery.id)}
                onComplete={() => handleStartPhotoCapture(delivery.id)}
                onNavigate={() => handleNavigate(delivery.order.delivery_address || '')}
                actionLoading={actionLoading === delivery.id}
              />
            ))}
          </div>
        )}
      </div>

      {pendingAssignment && (
        <OrderPreviewModal
          assignment={pendingAssignment}
          onAccept={handleAcceptOrder}
          onDecline={handleDeclineOrder}
          isOpen={true}
        />
      )}

      {showPhotoCapture && (
        <PhotoCapture
          orderId={showPhotoCapture}
          onPhotoCapture={handlePhotoCapture}
          onCancel={() => setShowPhotoCapture(null)}
          title="Proof of Delivery"
          subtitle="Take a photo of the delivered order"
        />
      )}
    </div>
  );
}

interface DeliveryCardProps {
  delivery: AssignmentWithOrder;
  expanded: boolean;
  onToggleExpand: () => void;
  onPickup: () => void;
  onComplete: () => void;
  onNavigate: () => void;
  actionLoading: boolean;
}

function DeliveryCard({
  delivery,
  expanded,
  onToggleExpand,
  onPickup,
  onComplete,
  onNavigate,
  actionLoading,
}: DeliveryCardProps) {
  const order = delivery.order;

  const getStatusConfig = () => {
    switch (delivery.status) {
      case 'assigned':
        return { color: tokens.colors.brand.primary, label: 'Assigned', icon: '📋' };
      case 'accepted':
        return { color: tokens.colors.status.warning, label: 'En Route to Pickup', icon: '🚗' };
      case 'picked_up':
        return { color: tokens.colors.status.info, label: 'On Delivery', icon: '📦' };
      case 'delivered':
        return { color: tokens.colors.status.success, label: 'Delivered', icon: '✅' };
      default:
        return { color: tokens.colors.subtle, label: delivery.status, icon: '❓' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      style={{
        background: tokens.colors.background.card,
        borderRadius: '20px',
        border: `2px solid ${statusConfig.color}`,
        overflow: 'hidden',
        boxShadow: tokens.shadows.lg,
      }}
    >
      <div
        onClick={onToggleExpand}
        style={{
          padding: '20px',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${statusConfig.color}15, ${statusConfig.color}05)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text, marginBottom: '4px' }}>
              Order #{order.order_number}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
              {order.customer_name || 'Customer'}
            </div>
          </div>
          <div
            style={{
              padding: '8px 16px',
              background: `${statusConfig.color}20`,
              border: `1px solid ${statusConfig.color}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              color: statusConfig.color,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
        </div>

        <div style={{ fontSize: '15px', color: tokens.colors.text, marginBottom: '12px' }}>
          📍 {order.delivery_address || 'No address'}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text }}>
              ₪{order.total_amount.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>Total</div>
          </div>
          <div
            style={{
              flex: 1,
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text }}>
              {order.items?.length || 0}
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>Items</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px', borderTop: `1px solid ${tokens.colors.background.cardBorder}` }}>
          {order.items && order.items.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text, marginBottom: '12px' }}>
                Order Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: tokens.colors.bg,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: tokens.colors.text }}>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text }}>
                      ₪{item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.delivery_instructions && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600', color: tokens.colors.brand.primary, marginBottom: '6px' }}>
                Special Instructions
              </div>
              <div style={{ fontSize: '14px', color: tokens.colors.text, lineHeight: '1.5' }}>
                {order.delivery_instructions}
              </div>
            </div>
          )}

          <CustomerContact
            customerName={order.customer_name}
            customerPhone={order.customer_phone}
            orderNumber={order.order_number}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button
              onClick={onNavigate}
              variant="secondary"
              size="medium"
              style={{ flex: 1 }}
            >
              🗺️ Navigate
            </Button>

            {delivery.status === 'accepted' && (
              <Button
                onClick={onPickup}
                disabled={actionLoading}
                variant="primary"
                size="medium"
                style={{ flex: 1 }}
              >
                {actionLoading ? '⏳ Processing...' : '📦 Mark Picked Up'}
              </Button>
            )}

            {delivery.status === 'picked_up' && (
              <Button
                onClick={onComplete}
                disabled={actionLoading}
                variant="primary"
                size="medium"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                {actionLoading ? '⏳ Processing...' : '✅ Complete Delivery'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
