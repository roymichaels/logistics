import React, { useState, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
import { logger } from '../../lib/logger';
import { driverService, DriverStatus, DriverProfile } from '../../services/driver';
import { assignmentService, AssignmentWithOrder } from '../../services/assignments';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../utils/haptic';
import { Toast } from '../../components/Toast';
import { DeliveryMap, DeliveryLocation } from '../../components/driver/DeliveryMap';
import { PhotoCapture } from '../../components/driver/PhotoCapture';
import { OrderPreviewModal } from '../../components/driver/OrderPreviewModal';
import { CustomerContact } from '../../components/driver/CustomerContact';
import { EarningsCounter } from '../../components/driver/EarningsCounter';
import { Button } from '../../components/atoms/Button';

type DriverMode = 'freelance' | 'collab';

interface UnifiedDriverDashboardProps {
  mode?: DriverMode;
}

export function UnifiedDriverDashboard({ mode: initialMode = 'freelance' }: UnifiedDriverDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<DriverMode>(initialMode);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [deliveries, setDeliveries] = useState<AssignmentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<AssignmentWithOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeView, setActiveView] = useState<'deliveries' | 'stats'>('deliveries');

  const [todayStats, setTodayStats] = useState({
    deliveries: 0,
    earnings: 0,
    hours: 0,
    rating: 5.0
  });

  const [performanceStats, setPerformanceStats] = useState({
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalDeliveries: 0,
    averageRating: 5.0,
    acceptanceRate: 100,
    completionRate: 100,
    onTimeRate: 100,
    totalDistance: 0
  });

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
  }, [user, mode]);

  const loadAllData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadDriverProfile(),
        loadDeliveries(),
        loadTodayStats(),
        loadPerformanceStats()
      ]);
    } catch (error) {
      logger.error('[UnifiedDriverDashboard] Failed to load data:', error);
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
      setStatus(statusResult.data);
      setIsOnline(statusResult.data.status === 'online' || statusResult.data.status === 'busy');
    }
  };

  const loadDeliveries = async () => {
    if (!user?.id) return;

    const { data, error } = await assignmentService.getDriverActiveAssignments(user.id);

    if (error) {
      logger.error('[UnifiedDriverDashboard] Failed to load deliveries', error);
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
        hours: 0,
        rating: profile?.rating || 5.0
      });
    }
  };

  const loadPerformanceStats = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [{ data: weeklyData }, { data: monthlyData }] = await Promise.all([
      driverService.getDriverEarnings(user.id, weekAgo, today),
      driverService.getDriverEarnings(user.id, monthAgo, today)
    ]);

    const weeklyEarnings = weeklyData?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
    const monthlyEarnings = monthlyData?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;

    setPerformanceStats({
      weeklyEarnings,
      monthlyEarnings,
      totalDeliveries: profile?.total_deliveries || 0,
      averageRating: profile?.rating || 5.0,
      acceptanceRate: profile?.acceptance_rate || 100,
      completionRate: profile?.completion_rate || 100,
      onTimeRate: profile?.on_time_rate || 100,
      totalDistance: profile?.total_distance || 0
    });
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;

    try {
      const newStatus = isOnline ? 'offline' : 'online';
      const { error } = await driverService.updateDriverStatus(user.id, newStatus);

      if (error) {
        logger.error('[UnifiedDriverDashboard] Failed to update status:', error);
        Toast.error('Failed to update status');
        return;
      }

      setIsOnline(!isOnline);
      haptic('medium');
      Toast.success(isOnline ? 'You are now offline' : 'You are now online');
    } catch (error) {
      logger.error('[UnifiedDriverDashboard] Error toggling status:', error);
    }
  };

  const handleNewAssignment = (assignment: any) => {
    logger.info('[UnifiedDriverDashboard] New assignment received', assignment);
    setPendingAssignment(assignment);
    haptic('success');

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const handleAssignmentUpdate = (assignment: any) => {
    logger.info('[UnifiedDriverDashboard] Assignment updated', assignment);
    loadDeliveries();
  };

  const handleAcceptOrder = async () => {
    if (!pendingAssignment) return;

    try {
      setActionLoading(pendingAssignment.id);
      haptic('medium');

      const { error } = await assignmentService.acceptAssignment(pendingAssignment.id);

      if (error) {
        Toast.error('Failed to accept order');
        return;
      }

      Toast.success('Order accepted!');
      haptic('success');
      setPendingAssignment(null);
      loadDeliveries();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineOrder = async () => {
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
        Toast.error('Failed to mark as picked up');
        return;
      }

      Toast.success('Marked as picked up!');
      haptic('success');
      loadDeliveries();
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhotoCapture = async (photoUrl: string) => {
    if (!showPhotoCapture) return;

    try {
      const { error } = await assignmentService.markOrderDelivered(showPhotoCapture, photoUrl);

      if (error) {
        Toast.error('Failed to complete delivery');
        return;
      }

      Toast.success('Delivery completed!');
      haptic('success');
      setShowPhotoCapture(null);
      loadDeliveries();
      loadTodayStats();
    } catch (error) {
      logger.error('[UnifiedDriverDashboard] Exception completing delivery', error);
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
      status: d.status
    }));

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
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header with Mode Switcher */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        borderBottom: `1px solid ${tokens.colors.background.cardBorder}`
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: '#fff'
          }}>
            👋 שלום נהג!
          </h1>
          <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px' }}>
            {isOnline ? 'אתה מחובר ומוכן למשלוחים' : 'התחבר כדי להתחיל לעבוד'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          padding: '6px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '16px'
        }}>
          <button
            onClick={() => {
              setMode('freelance');
              haptic('light');
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'freelance'
                ? 'linear-gradient(135deg, #1D9BF0, #1A8CD8)'
                : 'transparent',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: mode === 'freelance' ? tokens.glows.primaryStrong : 'none'
            }}
          >
            🌍 פרילנס
          </button>
          <button
            onClick={() => {
              setMode('collab');
              haptic('light');
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'collab'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'transparent',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: mode === 'collab' ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none'
            }}
          >
            🏢 שותף עסקי
          </button>
        </div>

        {/* Mode Description */}
        <div style={{
          padding: '12px 16px',
          background: mode === 'freelance'
            ? 'rgba(29, 155, 240, 0.2)'
            : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${mode === 'freelance' ? 'rgba(29, 155, 240, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', color: '#fff', lineHeight: '1.5' }}>
            {mode === 'freelance'
              ? '📦 מצב פרילנס: קבל משלוחים מכל העסקים בפלטפורמה'
              : '🏢 מצב שותף: משלוחים רק מהעסק המחובר אליו'}
          </div>
        </div>

        {/* Online Toggle */}
        <div style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '4px'
            }}>
              סטטוס
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {isOnline ? 'מחובר' : 'לא מחובר'}
            </div>
          </div>

          <button
            onClick={toggleOnlineStatus}
            style={{
              position: 'relative',
              width: '72px',
              height: '40px',
              background: isOnline
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255, 255, 255, 0.2)',
              border: `2px solid ${isOnline ? '#10b981' : 'rgba(255, 255, 255, 0.3)'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              [isOnline ? 'right' : 'left']: '4px',
              width: '28px',
              height: '28px',
              background: '#ffffff',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            fontSize: '14px',
            color: tokens.colors.subtle,
            marginBottom: '8px'
          }}>
            רווחי היום
          </div>
          <EarningsCounter
            currentEarnings={todayStats.earnings}
            isAnimating={actionLoading !== null}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <StatCard
            icon="📦"
            value={todayStats.deliveries.toString()}
            label="משלוחים"
          />
          <StatCard
            icon="⭐"
            value={profile?.rating.toFixed(1) || '5.0'}
            label="דירוג"
          />
          <StatCard
            icon="🚀"
            value={profile?.total_deliveries.toString() || '0'}
            label="סה״כ"
          />
        </div>

        {/* View Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveView('deliveries')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeView === 'deliveries'
                ? tokens.gradients.primary
                : tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: activeView === 'deliveries' ? '#fff' : tokens.colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🚚 משלוחים ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveView('stats')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeView === 'stats'
                ? tokens.gradients.primary
                : tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: activeView === 'stats' ? '#fff' : tokens.colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📊 ביצועים
          </button>
        </div>

        {/* Content Area */}
        {activeView === 'deliveries' ? (
          <>
            {activeDeliveries.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <DeliveryMap
                  driverLocation={driverLocation}
                  deliveries={deliveryLocations}
                  height="280px"
                  showRoute={true}
                  onLocationUpdate={handleLocationUpdate}
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
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: tokens.colors.text,
                  marginBottom: '8px'
                }}>
                  אין משלוחים פעילים
                </div>
                <div style={{ fontSize: '15px', color: tokens.colors.subtle }}>
                  {isOnline
                    ? 'הזמנות חדשות יופיעו כאן'
                    : 'התחבר כדי לקבל הזמנות'}
                </div>
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
          </>
        ) : (
          <PerformanceView stats={performanceStats} />
        )}
      </div>

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

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={{
      background: tokens.colors.background.card,
      borderRadius: '16px',
      padding: '16px',
      border: `1px solid ${tokens.colors.background.cardBorder}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: tokens.colors.text,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>
        {label}
      </div>
    </div>
  );
}

function PerformanceView({ stats }: { stats: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: tokens.colors.status.success,
          marginBottom: '8px'
        }}>
          ₪{stats.weeklyEarnings.toFixed(0)}
        </div>
        <div style={{ fontSize: '15px', color: tokens.colors.text }}>
          רווחי השבוע
        </div>
      </div>

      <div style={{
        background: tokens.colors.background.card,
        borderRadius: '20px',
        padding: '24px',
        border: `1px solid ${tokens.colors.background.cardBorder}`
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: tokens.colors.text,
          marginBottom: '16px'
        }}>
          מדדי ביצועים
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <MetricBox
            label="דירוג"
            value={`${stats.averageRating.toFixed(1)} ⭐`}
            color={tokens.colors.status.warning}
          />
          <MetricBox
            label="קבלה"
            value={`${stats.acceptanceRate.toFixed(0)}%`}
            color={tokens.colors.status.success}
          />
          <MetricBox
            label="השלמה"
            value={`${stats.completionRate.toFixed(0)}%`}
            color={tokens.colors.brand.primary}
          />
          <MetricBox
            label="בזמן"
            value={`${stats.onTimeRate.toFixed(0)}%`}
            color={tokens.colors.status.info}
          />
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '16px',
      background: `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>
        {label}
      </div>
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
