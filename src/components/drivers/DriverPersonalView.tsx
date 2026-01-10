import React, { useState, useEffect, useMemo } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { logger } from '../../lib/logger';
import { driverService, DriverProfile, DriverStatus as DriverServiceStatus } from '../../services/driver';
import { assignmentService, AssignmentWithOrder } from '../../services/assignments';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../utils/haptic';
import { Toast } from '../Toast';
import { DriverStatsCard, OnlineToggle } from './shared';
import { DeliveryMap, DeliveryLocation } from '../driver/DeliveryMap';
import { PhotoCapture } from '../driver/PhotoCapture';
import { OrderPreviewModal } from '../driver/OrderPreviewModal';
import { CustomerContact } from '../driver/CustomerContact';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundStatCard,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundSection,
  UndergroundHeader
} from '../underground';

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
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl'],
      direction: 'rtl'
    }}>
      <UndergroundHeader
        title="👋 שלום נהג!"
        subtitle={isOnline ? 'אתה מחובר ומוכן למשלוחים' : 'התחבר כדי להתחיל לעבוד'}
      />

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['2xl'] }}>
        <OnlineToggle
          isOnline={isOnline}
          onToggle={toggleOnlineStatus}
        />
      </UndergroundSection>

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['2xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: undergroundTheme.spacing.md
        }}>
          <UndergroundStatCard
            icon="📦"
            value={todayStats.deliveries.toString()}
            label="משלוחים היום"
          />
          <UndergroundStatCard
            icon="💰"
            value={`₪${todayStats.earnings.toFixed(0)}`}
            label="רווחים היום"
            accentColor={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            icon="⭐"
            value={profile?.rating.toFixed(1) || '5.0'}
            label="דירוג ממוצע"
            accentColor={undergroundTheme.colors.status.warning}
          />
        </div>
      </UndergroundSection>

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary,
          marginBottom: undergroundTheme.spacing.lg,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          📦 המשלוחים שלי ({activeDeliveries.length})
        </h2>

        {activeDeliveries.length > 0 && (
          <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
            <DeliveryMap
              driverLocation={driverLocation}
              deliveries={deliveryLocations}
              height="280px"
              showRoute={true}
            />
          </div>
        )}

        {activeDeliveries.length === 0 ? (
          <UndergroundEmptyState
            icon="📭"
            title="אין משלוחים פעילים"
            description={isOnline ? 'הזמנות חדשות יופיעו כאן' : 'התחבר כדי לקבל הזמנות'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
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
      </UndergroundSection>

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary,
          marginBottom: undergroundTheme.spacing.lg,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          פעולות מהירות
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: undergroundTheme.spacing.md
        }}>
          <UndergroundCard
            variant="light"
            onClick={() => {
              navigate('/driver/earnings');
              haptic('light');
            }}
            style={{ cursor: 'pointer', textAlign: 'right' }}
          >
            <div style={{ fontSize: '32px', marginBottom: undergroundTheme.spacing.sm }}>💵</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.lg,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.xs
            }}>
              הרווחים שלי
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.tertiary
            }}>
              היסטוריית תשלומים
            </div>
          </UndergroundCard>

          <UndergroundCard
            variant="light"
            onClick={() => {
              navigate('/driver/profile');
              haptic('light');
            }}
            style={{ cursor: 'pointer', textAlign: 'right' }}
          >
            <div style={{ fontSize: '32px', marginBottom: undergroundTheme.spacing.sm }}>⚙️</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.lg,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.xs
            }}>
              הפרופיל שלי
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.tertiary
            }}>
              הגדרות ופרטים אישיים
            </div>
          </UndergroundCard>
        </div>
      </UndergroundSection>

      {profile && (
        <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
          <UndergroundCard variant="darker">
            <h2 style={{
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.lg,
              textShadow: undergroundTheme.shadows.glow.cyan
            }}>
              פרטי רכב
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary
                }}>
                  סוג רכב
                </span>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {profile.vehicle_type || 'לא צוין'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary
                }}>
                  מספר רכב
                </span>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {profile.vehicle_plate || 'לא צוין'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.surface.darker,
                borderRadius: undergroundTheme.borderRadius.lg,
                border: `1px solid ${undergroundTheme.colors.border.subtle}`
              }}>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary
                }}>
                  סה"כ משלוחים
                </span>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {profile.total_deliveries || 0}
                </span>
              </div>
            </div>
          </UndergroundCard>
        </UndergroundSection>
      )}

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
        return { color: undergroundTheme.colors.primary.cyan, label: 'נקבע', icon: '📋' };
      case 'accepted':
        return { color: undergroundTheme.colors.status.warning, label: 'באיסוף', icon: '🚗' };
      case 'picked_up':
        return { color: undergroundTheme.colors.status.info, label: 'במשלוח', icon: '📦' };
      default:
        return { color: undergroundTheme.colors.text.tertiary, label: delivery.status, icon: '❓' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <UndergroundCard variant="light" style={{ overflow: 'hidden' }}>
      <div
        onClick={onToggleExpand}
        style={{
          padding: undergroundTheme.spacing.lg,
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${statusConfig.color}15, ${statusConfig.color}05)`,
          borderBottom: expanded ? `1px solid ${undergroundTheme.colors.border.subtle}` : 'none'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: undergroundTheme.spacing.md
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.xs,
              textShadow: undergroundTheme.shadows.glow.text
            }}>
              הזמנה #{order.order_number}
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary
            }}>
              {order.customer_name || 'לקוח'}
            </div>
          </div>
          <div style={{
            padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}`,
            background: `${statusConfig.color}20`,
            border: `1px solid ${statusConfig.color}`,
            borderRadius: undergroundTheme.borderRadius.lg,
            fontSize: undergroundTheme.typography.fontSize.sm,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            color: statusConfig.color,
            display: 'flex',
            alignItems: 'center',
            gap: undergroundTheme.spacing.xs,
            boxShadow: `0 0 20px ${statusConfig.color}40`
          }}>
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
        </div>

        <div style={{
          fontSize: undergroundTheme.typography.fontSize.md,
          color: undergroundTheme.colors.text.primary,
          marginBottom: undergroundTheme.spacing.md
        }}>
          📍 {order.delivery_address || 'אין כתובת'}
        </div>

        <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
          <div style={{
            flex: 1,
            padding: undergroundTheme.spacing.md,
            background: undergroundTheme.colors.surface.darker,
            borderRadius: undergroundTheme.borderRadius.lg,
            border: `1px solid ${undergroundTheme.colors.border.subtle}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              ₪{order.total_amount.toFixed(2)}
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xs,
              color: undergroundTheme.colors.text.tertiary
            }}>
              סכום
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: undergroundTheme.spacing.md,
            background: undergroundTheme.colors.surface.darker,
            borderRadius: undergroundTheme.borderRadius.lg,
            border: `1px solid ${undergroundTheme.colors.border.subtle}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              {order.items?.length || 0}
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xs,
              color: undergroundTheme.colors.text.tertiary
            }}>
              פריטים
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: undergroundTheme.spacing.lg }}>
          {order.customer_name && (
            <CustomerContact
              customerName={order.customer_name}
              customerPhone={order.customer_phone}
              orderNumber={order.order_number}
            />
          )}

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="secondary"
              onClick={onNavigate}
              style={{ flex: 1 }}
            >
              🗺️ ניווט
            </UndergroundButton>

            {delivery.status === 'accepted' && (
              <UndergroundButton
                variant="primary"
                onClick={onPickup}
                disabled={actionLoading}
                style={{ flex: 1 }}
              >
                {actionLoading ? '⏳ מעבד...' : '📦 נאסף'}
              </UndergroundButton>
            )}

            {delivery.status === 'picked_up' && (
              <UndergroundButton
                variant="primary"
                onClick={onComplete}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  background: `linear-gradient(135deg, ${undergroundTheme.colors.status.success}, ${undergroundTheme.colors.status.success}CC)`,
                  boxShadow: undergroundTheme.shadows.glow.green
                }}
              >
                {actionLoading ? '⏳ מעבד...' : '✅ הושלם'}
              </UndergroundButton>
            )}
          </div>
        </div>
      )}
    </UndergroundCard>
  );
}
