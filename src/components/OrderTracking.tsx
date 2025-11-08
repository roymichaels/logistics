import React, { useEffect, useState, useCallback } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES, getStatusBadgeStyle } from '../styles/royalTheme';
import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface OrderTrackingProps {
  orderId: string;
  supabase: any;
  onClose?: () => void;
}

interface OrderStatus {
  status: string;
  timestamp: string;
  notes?: string;
}

interface DriverInfo {
  user_id: string;
  name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  rating: number;
  current_latitude?: number;
  current_longitude?: number;
}

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  items: any[];
  total_amount: number;
  notes?: string;
  assigned_driver?: string;
  created_at: string;
  estimated_delivery_time?: string;
  delivery_proof_url?: string;
}

export function OrderTracking({ orderId, supabase, onClose }: OrderTrackingProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatus[]>([]);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderData = useCallback(async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      const { data: historyData } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      setStatusHistory(
        (historyData || []).map((h: any) => ({
          status: h.status,
          timestamp: h.changed_at,
          notes: h.notes
        }))
      );

      if (orderData.assigned_driver) {
        const { data: driverData } = await supabase
          .from('driver_profiles')
          .select('*, users!driver_profiles_user_id_fkey(name, phone)')
          .eq('user_id', orderData.assigned_driver)
          .single();

        if (driverData) {
          setDriverInfo({
            user_id: driverData.user_id,
            name: driverData.users?.name,
            phone: driverData.users?.phone,
            vehicle_type: driverData.vehicle_type,
            vehicle_plate: driverData.vehicle_plate,
            rating: driverData.rating,
            current_latitude: driverData.current_latitude,
            current_longitude: driverData.current_longitude
          });
        }
      }

      setError(null);
    } catch (err) {
      logger.error('Failed to load order data:', err);
      setError('שגיאה בטעינת נתוני ההזמנה');
      Toast.error('שגיאה בטעינת נתוני ההזמנה');
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase]);

  useEffect(() => {
    loadOrderData();

    const subscription = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload: any) => {
          logger.info('Order update received:', payload);
          loadOrderData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderId}`
        },
        (payload: any) => {
          logger.info('Status history update:', payload);
          loadOrderData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, supabase, loadOrderData]);

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      new: '📋',
      confirmed: '✅',
      preparing: '📦',
      ready: '🎁',
      out_for_delivery: '🚗',
      delivered: '✨',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      new: 'הזמנה חדשה',
      confirmed: 'אושרה',
      preparing: 'בהכנה',
      ready: 'מוכן לאיסוף',
      out_for_delivery: 'בדרך אליך',
      delivered: 'נמסר',
      cancelled: 'בוטל'
    };
    return labels[status] || status;
  };

  const statusSteps = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const currentStepIndex = order ? statusSteps.indexOf(order.status) : -1;

  if (loading) {
    return (
      <div
        style={{
          ...ROYAL_STYLES.pageContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'spin 2s linear infinite'
            }}
          >
            ⚡
          </div>
          <div style={{ color: ROYAL_COLORS.muted }}>טוען מעקב הזמנה...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
          <div style={{ color: ROYAL_COLORS.error, marginBottom: '16px' }}>{error}</div>
          {onClose && (
            <button onClick={onClose} style={ROYAL_STYLES.buttonPrimary}>
              חזור
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            marginBottom: '16px',
            padding: '8px 16px'
          }}
        >
          ← חזור
        </button>
      )}

      <div style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>מעקב הזמנה #{order.id.slice(0, 8)}</h1>
        <div style={{ ...getStatusBadgeStyle(order.status), marginTop: '8px' }}>
          {getStatusIcon(order.status)} {getStatusLabel(order.status)}
        </div>
      </div>

      <div
        style={{
          ...ROYAL_STYLES.card,
          marginBottom: '20px',
          background: ROYAL_COLORS.gradientCard
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '48px',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: ROYAL_COLORS.gradientPurple,
              borderRadius: '16px'
            }}
          >
            📍
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: ROYAL_COLORS.text,
                marginBottom: '4px'
              }}
            >
              {order.customer_name}
            </div>
            <div style={{ fontSize: '16px', color: ROYAL_COLORS.muted, lineHeight: '1.5' }}>
              {order.customer_address}
            </div>
          </div>
        </div>

        {order.estimated_delivery_time && order.status !== 'delivered' && (
          <div
            style={{
              padding: '12px',
              background: `${ROYAL_COLORS.info}20`,
              border: `1px solid ${ROYAL_COLORS.info}50`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '24px' }}>⏰</div>
            <div>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>זמן אספקה משוער</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: ROYAL_COLORS.info }}>
                {new Date(order.estimated_delivery_time).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ ...ROYAL_STYLES.card, marginBottom: '20px' }}>
        <h3 style={ROYAL_STYLES.cardTitle}>התקדמות משלוח</h3>
        <div style={{ position: 'relative', paddingRight: '40px' }}>
          {statusSteps.slice(0, -1).map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step} style={{ position: 'relative', paddingBottom: '32px' }}>
                {index < statusSteps.length - 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '32px',
                      width: '2px',
                      height: 'calc(100% - 16px)',
                      background: isCompleted ? ROYAL_COLORS.accent : `${ROYAL_COLORS.hint}30`
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isCompleted
                        ? ROYAL_COLORS.gradientPurple
                        : ROYAL_COLORS.secondary,
                      border: `2px solid ${
                        isCurrent ? ROYAL_COLORS.accentBright : ROYAL_COLORS.cardBorder
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      boxShadow: isCurrent ? ROYAL_COLORS.glowPurpleStrong : 'none',
                      animation: isCurrent ? 'pulse 2s infinite' : 'none'
                    }}
                  >
                    {isCompleted ? '✓' : getStatusIcon(step)}
                  </div>

                  <div style={{ marginRight: '48px' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: isCurrent ? '700' : '600',
                        color: isCompleted ? ROYAL_COLORS.text : ROYAL_COLORS.mutedDark,
                        marginBottom: '4px'
                      }}
                    >
                      {getStatusLabel(step)}
                    </div>
                    {statusHistory.find((h) => h.status === step) && (
                      <div style={{ fontSize: '12px', color: ROYAL_COLORS.hint }}>
                        {new Date(
                          statusHistory.find((h) => h.status === step)!.timestamp
                        ).toLocaleString('he-IL')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {driverInfo && (
        <div style={{ ...ROYAL_STYLES.card, marginBottom: '20px' }}>
          <h3 style={ROYAL_STYLES.cardTitle}>פרטי שליח</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: ROYAL_COLORS.gradientPurple,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px'
              }}
            >
              🚗
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.text,
                  marginBottom: '4px'
                }}
              >
                {driverInfo.name || 'שליח'}
              </div>
              {driverInfo.phone && (
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  📞 {driverInfo.phone}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: ROYAL_COLORS.gold }}>
                  ⭐ {driverInfo.rating.toFixed(1)}
                </div>
                {driverInfo.vehicle_type && (
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                    • {driverInfo.vehicle_type}
                  </div>
                )}
                {driverInfo.vehicle_plate && (
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                    • {driverInfo.vehicle_plate}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...ROYAL_STYLES.card, marginBottom: '20px' }}>
        <h3 style={ROYAL_STYLES.cardTitle}>פרטי הזמנה</h3>
        <div style={{ marginBottom: '16px' }}>
          {order.items.map((item: any, index: number) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom:
                  index < order.items.length - 1 ? `1px solid ${ROYAL_COLORS.cardBorder}50` : 'none'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                  {item.product_name || item.name}
                </div>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                  ₪{item.price} × {item.quantity}
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
                ₪{(item.price * item.quantity).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: `2px solid ${ROYAL_COLORS.cardBorder}`,
            fontSize: '20px',
            fontWeight: '700'
          }}
        >
          <span style={{ color: ROYAL_COLORS.text }}>סה"כ</span>
          <span style={{ color: ROYAL_COLORS.gold }}>
            ₪{order.total_amount.toLocaleString()}
          </span>
        </div>
      </div>

      {order.delivery_proof_url && (
        <div style={{ ...ROYAL_STYLES.card, marginBottom: '20px' }}>
          <h3 style={ROYAL_STYLES.cardTitle}>אישור מסירה</h3>
          <img
            src={order.delivery_proof_url}
            alt="Delivery proof"
            style={{ width: '100%', borderRadius: '12px', marginTop: '12px' }}
          />
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
