import React, { useState, useEffect, useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import { logger } from '../../lib/logger';
import { driverService, DriverProfile, DriverStatus as DriverServiceStatus } from '../../services/driver';
import { assignmentService, AssignmentWithOrder } from '../../services/assignments';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../utils/haptic';
import { Toast } from '../../components/Toast';
import { DriverStatsCard, OnlineToggle } from './shared';
import { DeliveryMap, DeliveryLocation } from '../driver/DeliveryMap';
import { PhotoCapture } from '../driver/PhotoCapture';
import { OrderPreviewModal } from '../driver/OrderPreviewModal';
import { CustomerContact } from '../driver/CustomerContact';
import { Button } from '../atoms/Button';

export function DriverPersonalView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [deliveries, setDeliveries] = useState<AssignmentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<AssignmentWithOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [todayStats, setTodayStats] = useState({
    deliveries: 0,
    earnings: 0,
    rating: 5.0
  });

  const activeDeliveries = useMemo(() =>
    deliveries.filter((d) =>
      ['assigned', 'accepted', 'picked_up'].includes(d.status)
    ),
    [deliveries]
  );

  const deliveryLocations: DeliveryLocation[] = useMemo(() =>
    activeDeliveries
      .filter((d) => d.order.delivery_address)
      .map((d) => ({
        id: d.id,
        type: d.status === 'accepted' ? 'pickup' : 'dropoff',
        lat: 32.0853 + (Math.random() - 0.5) * 0.1,
        lng: 34.7818 + (Math.random() - 0.5) * 0.1,
        address: d.order.delivery_address!,
        name: d.order.customer_name || undefined,
        orderNumber: d.order.order_number,
        status: d.status
      })),
    [activeDeliveries]
  );

  useEffect(() => {
    if (user?.id) {
      loadAllData();

      const unsubscribe = assignmentService.subscribeToDriverAssignments(
        user.id,
        handleNewAssignment,
        handleAssignmentUpdate
      );

      return () => unsubscribe();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadDriverProfile(),
        loadDeliveries(),
        loadTodayStats()
      ]);
    } catch (error) {
      logger.error('[DriverPersonalView] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverProfile = async () => {
    if (!user?.id) return;

    const [profileResult, statusResult] = await Promise.all([
      driverService.getDriverProfile(user.id),
      driverService.getDriverStatus(user.id)
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
    }

    if (statusResult.data) {
      setIsOnline(statusResult.data.status === 'online' || statusResult.data.status === 'busy');
    }
  };

  const loadDeliveries = async () => {
    if (!user?.id) return;

    const { data, error } = await assignmentService.getDriverActiveAssignments(user.id);

    if (error) {
      logger.error('[DriverPersonalView] Failed to load deliveries', error);
      return;
    }

    setDeliveries(data);
  };

  const loadTodayStats = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await driverService.getDriverEarnings(user.id, today, today);

    if (data && data.length > 0) {
      const todayData = data[0];
      setTodayStats({
        deliveries: todayData.total_deliveries,
        earnings: todayData.net_earnings,
        rating: profile?.rating || 5.0
      });
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;

    try {
      const newStatus = isOnline ? 'offline' : 'online';
      const { error } = await driverService.updateDriverStatus(user.id, newStatus);

      if (error) {
        logger.error('[DriverPersonalView] Failed to update status:', error);
        Toast.error('Failed to update status');
        return;
      }

      setIsOnline(!isOnline);
      haptic('medium');
      Toast.success(isOnline ? 'אתה כעת לא מחובר' : 'אתה כעת מחובר');
    } catch (error) {
      logger.error('[DriverPersonalView] Error toggling status:', error);
    }
  };

  const handleNewAssignment = (assignment: any) => {
    logger.info('[DriverPersonalView] New assignment received', assignment);
    setPendingAssignment(assignment);
    haptic('success');
    Toast.success('משימה חדשה התקבלה!');
  };

  const handleAssignmentUpdate = (assignment: any) => {
    logger.info('[DriverPersonalView] Assignment updated', assignment);
    loadDeliveries();
  };

  const handleAcceptOrder = async () => {
    if (!pendingAssignment) return;

    try {
      setActionLoading(pendingAssignment.id);
      haptic('medium');

      const { error } = await assignmentService.acceptAssignment(pendingAssignment.id);

      if (error) {
        logger.error('[DriverPersonalView] Failed to accept assignment', error);
        Toast.error('Failed to accept order');
        return;
      }

      await driverService.updateDriverStatus(user!.id, 'busy');

      Toast.success('משימה התקבלה!');
      haptic('success');
      setPendingAssignment(null);
      loadDeliveries();
    } catch (error) {
      logger.error('[DriverPersonalView] Exception accepting order', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineOrder = async () => {
    haptic('light');
    setPendingAssignment(null);
    Toast.info('משימה נדחתה');
  };

  const handlePickup = async (assignmentId: string) => {
    try {
      setActionLoading(assignmentId);
      haptic('medium');

      const { error } = await assignmentService.markOrderPickedUp(assignmentId);

      if (error) {
        logger.error('[DriverPersonalView] Failed to mark as picked up', error);
        Toast.error('Failed to mark as picked up');
        return;
      }

      Toast.success('סומן כנאסף!');
      haptic('success');
      loadDeliveries();
    } catch (error) {
      logger.error('[DriverPersonalView] Exception marking pickup', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhotoCapture = async (photoUrl: string) => {
    if (!showPhotoCapture) return;

    try {
      const { error } = await assignmentService.markOrderDelivered(showPhotoCapture, photoUrl);

      if (error) {
        logger.error('[DriverPersonalView] Failed to complete delivery', error);
        Toast.error('Failed to complete delivery');
        return;
      }

      const hasMoreDeliveries = activeDeliveries.length > 1;
      if (!hasMoreDeliveries && user?.id) {
        await driverService.updateDriverStatus(user.id, 'online');
      }

      Toast.success('משלוח הושלם!');
      haptic('success');
      setShowPhotoCapture(null);
      await Promise.all([loadDeliveries(), loadTodayStats()]);
    } catch (error) {
      logger.error('[DriverPersonalView] Exception completing delivery', error);
    }
  };

  const handleNavigate = (address: string) => {
    haptic('light');
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: tokens.colors.panel
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            טוען...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          color: tokens.colors.text
        }}>
          👋 שלום נהג!
        </h1>
        <p style={{ margin: '0', color: tokens.colors.subtle, fontSize: '16px' }}>
          {isOnline ? 'אתה מחובר ומוכן למשלוחים' : 'התחבר כדי להתחיל לעבוד'}
        </p>
      </div>

      {/* Online/Offline Toggle */}
      <div style={{ marginBottom: '24px' }}>
        <OnlineToggle
          isOnline={isOnline}
          onToggle={toggleOnlineStatus}
        />
      </div>

      {/* Today's Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <DriverStatsCard
          icon="📦"
          value={todayStats.deliveries}
          label="משלוחים היום"
        />
        <DriverStatsCard
          icon="💰"
          value={`₪${todayStats.earnings.toFixed(0)}`}
          label="רווחים היום"
          color={tokens.colors.status.success}
          gradient={true}
        />
        <DriverStatsCard
          icon="⭐"
          value={profile?.rating.toFixed(1) || '5.0'}
          label="דירוג ממוצע"
        />
      </div>

      {/* Deliveries Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: tokens.colors.text,
          marginBottom: '16px'
        }}>
          📦 המשלוחים שלי ({activeDeliveries.length})
        </h2>

        {activeDeliveries.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <DeliveryMap
              driverLocation={driverLocation}
              deliveries={deliveryLocations}
              height="280px"
              showRoute={true}
            />
          </div>
        )}

        {activeDeliveries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: tokens.colors.background.card,
            borderRadius: '20px',
            border: `1px solid ${tokens.colors.background.cardBorder}`
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: tokens.colors.text,
              marginBottom: '8px'
            }}>
              אין משלוחים פעילים
            </h3>
            <p style={{ color: tokens.colors.subtle, fontSize: '14px' }}>
              {isOnline ? 'הזמנות חדשות יופיעו כאן' : 'התחבר כדי לקבל הזמנות'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                expanded={expandedDelivery === delivery.id}
                onToggleExpand={() =>
                  setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)
                }
                onPickup={() => handlePickup(delivery.id)}
                onComplete={() => setShowPhotoCapture(delivery.id)}
                onNavigate={() => handleNavigate(delivery.order.delivery_address || '')}
                actionLoading={actionLoading === delivery.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: tokens.colors.text,
          marginBottom: '16px'
        }}>
          פעולות מהירות
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              navigate('/driver/earnings');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💵</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הרווחים שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle
            }}>
              היסטוריית תשלומים
            </div>
          </button>

          <button
            onClick={() => {
              navigate('/driver/profile');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הפרופיל שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle
            }}>
              הגדרות ופרטים אישיים
            </div>
          </button>
        </div>
      </div>

      {/* Driver Info Card */}
      {profile && (
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '16px'
          }}>
            פרטי רכב
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>סוג רכב</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.vehicle_type || 'לא צוין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>מספר רכב</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.vehicle_plate || 'לא צוין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>סה"כ משלוחים</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.total_deliveries || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
          title="אישור משלוח"
          subtitle="צלם תמונה של המשלוח שבוצע"
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
  actionLoading
}: DeliveryCardProps) {
  const order = delivery.order;

  const getStatusConfig = () => {
    switch (delivery.status) {
      case 'assigned':
        return { color: tokens.colors.brand.primary, label: 'נקבע', icon: '📋' };
      case 'accepted':
        return { color: tokens.colors.status.warning, label: 'באיסוף', icon: '🚗' };
      case 'picked_up':
        return { color: tokens.colors.status.info, label: 'במשלוח', icon: '📦' };
      default:
        return { color: tokens.colors.subtle, label: delivery.status, icon: '❓' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div style={{
      background: tokens.colors.background.card,
      borderRadius: '20px',
      border: `2px solid ${statusConfig.color}`,
      overflow: 'hidden'
    }}>
      <div
        onClick={onToggleExpand}
        style={{
          padding: '20px',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${statusConfig.color}15, ${statusConfig.color}05)`
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הזמנה #{order.order_number}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
              {order.customer_name || 'לקוח'}
            </div>
          </div>
          <div style={{
            padding: '8px 16px',
            background: `${statusConfig.color}20`,
            border: `1px solid ${statusConfig.color}`,
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            color: statusConfig.color,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
        </div>

        <div style={{
          fontSize: '15px',
          color: tokens.colors.text,
          marginBottom: '12px'
        }}>
          📍 {order.delivery_address || 'אין כתובת'}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1,
            padding: '12px',
            background: tokens.colors.bg,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              ₪{order.total_amount.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>סכום</div>
          </div>
          <div style={{
            flex: 1,
            padding: '12px',
            background: tokens.colors.bg,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              {order.items?.length || 0}
            </div>
            <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>פריטים</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${tokens.colors.background.cardBorder}`
        }}>
          {order.customer_name && (
            <CustomerContact
              customerName={order.customer_name}
              customerPhone={order.customer_phone}
              orderNumber={order.order_number}
            />
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button
              onClick={onNavigate}
              variant="secondary"
              size="medium"
              style={{ flex: 1 }}
            >
              🗺️ ניווט
            </Button>

            {delivery.status === 'accepted' && (
              <Button
                onClick={onPickup}
                disabled={actionLoading}
                variant="primary"
                size="medium"
                style={{ flex: 1 }}
              >
                {actionLoading ? '⏳ מעבד...' : '📦 נאסף'}
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
                  background: 'linear-gradient(135deg, #10b981, #059669)'
                }}
              >
                {actionLoading ? '⏳ מעבד...' : '✅ הושלם'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
