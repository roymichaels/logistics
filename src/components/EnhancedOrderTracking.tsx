import React, { useEffect, useState, useCallback } from 'react';
import { Order, DataStore } from '../data/types';
import { ORDER_STATUS_COLORS, ORDER_TIMELINE_STYLES } from '../styles/orderTheme';
import { Toast } from './Toast';

interface EnhancedOrderTrackingProps {
  orderId: string;
  dataStore: DataStore;
  onClose?: () => void;
  showActions?: boolean;
}

interface OrderStatusHistoryItem {
  status: Order['status'];
  timestamp: string;
  notes?: string;
}

const STATUS_FLOW: Order['status'][] = [
  'new',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered'
];

export function EnhancedOrderTracking({
  orderId,
  dataStore,
  onClose,
  showActions = false
}: EnhancedOrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderData = useCallback(async () => {
    try {
      setLoading(true);
      const orderData = await dataStore.getOrder?.(orderId);

      if (!orderData) {
        throw new Error('Order not found');
      }

      setOrder(orderData);
      setError(null);
    } catch (err) {
      console.error('Failed to load order:', err);
      setError('שגיאה בטעינת פרטי ההזמנה');
      Toast.error('שגיאה בטעינת פרטי ההזמנה');
    } finally {
      setLoading(false);
    }
  }, [orderId, dataStore]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  const currentStatusIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;

  const getStatusLabel = (status: Order['status']): string => {
    const labels: Record<Order['status'], string> = {
      new: 'הזמנה התקבלה',
      confirmed: 'אושרה על ידי המערכת',
      preparing: 'בהכנה במחסן',
      ready: 'מוכן למשלוח',
      out_for_delivery: 'בדרך אליך',
      delivered: 'נמסר ללקוח',
      cancelled: 'הזמנה בוטלה'
    };
    return labels[status] || status;
  };

  const getStatusDescription = (status: Order['status']): string => {
    const descriptions: Record<Order['status'], string> = {
      new: 'ההזמנה נקלטה במערכת ומחכה לאישור',
      confirmed: 'ההזמנה אושרה ועוברת לשלב ההכנה',
      preparing: 'הצוות שלנו מכין את ההזמנה',
      ready: 'ההזמנה ארוזה ומוכנה לאיסוף',
      out_for_delivery: 'השליח שלנו בדרך עם ההזמנה',
      delivered: 'ההזמנה נמסרה בהצלחה',
      cancelled: 'ההזמנה בוטלה'
    };
    return descriptions[status] || '';
  };

  const getEstimatedTime = (status: Order['status']): string => {
    if (!order) return '';

    const now = new Date();
    const orderTime = new Date(order.created_at);
    const minutesSinceOrder = Math.floor((now.getTime() - orderTime.getTime()) / 60000);

    const estimates: Record<Order['status'], string> = {
      new: 'עד 5 דקות',
      confirmed: 'עד 10 דקות',
      preparing: '15-30 דקות',
      ready: '5-10 דקות',
      out_for_delivery: order.estimated_delivery_time
        ? new Date(order.estimated_delivery_time).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '20-40 דקות',
      delivered: order.delivered_at
        ? new Date(order.delivered_at).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'הושלם',
      cancelled: ''
    };

    return estimates[status] || '';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            animation: 'bounce 1s infinite'
          }}>
            📦
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            טוען מעקב הזמנה...
          </div>
        </div>
        <style>
          {`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
          <div style={{ fontSize: '18px', color: '#F44336', marginBottom: '16px' }}>
            {error}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              חזור
            </button>
          )}
        </div>
      </div>
    );
  }

  const statusConfig = ORDER_STATUS_COLORS[order.status];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
      paddingBottom: '40px'
    }}>
      {/* Header */}
      <div style={{
        background: statusConfig.gradient,
        padding: '24px 20px',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                color: '#FFFFFF',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              ← חזור
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '48px' }}>{statusConfig.icon}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700' }}>
                {getStatusLabel(order.status)}
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>
                הזמנה #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
              זמן משוער
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>
              {getEstimatedTime(order.status)}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Progress Timeline */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#212121'
          }}>
            מעקב התקדמות
          </h2>

          <div style={{ position: 'relative' }}>
            {STATUS_FLOW.filter(s => s !== 'cancelled').map((status, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const config = ORDER_STATUS_COLORS[status];

              return (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: index < STATUS_FLOW.length - 2 ? '32px' : '0',
                    position: 'relative'
                  }}
                >
                  {/* Connection Line */}
                  {index < STATUS_FLOW.length - 2 && (
                    <div style={{
                      position: 'absolute',
                      right: '19px',
                      top: '40px',
                      width: '3px',
                      height: '32px',
                      background: isCompleted
                        ? 'linear-gradient(to bottom, #1D9BF0, #E0E0E0)'
                        : '#E0E0E0',
                      transition: 'all 0.5s ease'
                    }} />
                  )}

                  {/* Status Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    background: isCompleted ? config.gradient : '#F5F5F5',
                    color: isCompleted ? '#FFFFFF' : '#9E9E9E',
                    border: `3px solid ${isCurrent ? config.border : isCompleted ? config.border : '#E0E0E0'}`,
                    boxShadow: isCurrent ? `0 0 0 4px ${config.bg}` : 'none',
                    transition: 'all 0.3s ease',
                    animation: isCurrent ? 'pulse 2s infinite' : 'none',
                    flexShrink: 0
                  }}>
                    {isCompleted ? '✓' : config.icon}
                  </div>

                  {/* Status Content */}
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: isCurrent ? '700' : '600',
                      color: isCompleted ? '#212121' : '#9E9E9E',
                      marginBottom: '4px'
                    }}>
                      {getStatusLabel(status)}
                    </div>

                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.5'
                    }}>
                      {getStatusDescription(status)}
                    </div>

                    {isCurrent && getEstimatedTime(status) && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: config.bg,
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: config.text,
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        ⏱️ {getEstimatedTime(status)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: '#212121'
          }}>
            פרטי הזמנה
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ fontSize: '24px' }}>👤</div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>לקוח</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {order.customer_name}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ fontSize: '24px' }}>📍</div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>כתובת משלוח</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {order.customer_address}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ fontSize: '24px' }}>📞</div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>טלפון</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {order.customer_phone}
                </div>
              </div>
            </div>

            {order.notes && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ fontSize: '24px' }}>📝</div>
                <div>
                  <div style={{ fontSize: '14px', color: '#666' }}>הערות</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {order.notes}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: '#212121'
            }}>
              פריטים בהזמנה
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.items.map((item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {item.product_name || item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      ₪{item.price?.toLocaleString()} × {item.quantity}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1D9BF0'
                  }}>
                    ₪{((item.price || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '2px solid #E0E0E0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>סה״כ</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1D9BF0' }}>
                ₪{order.total_amount.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Proof */}
        {order.delivery_proof_url && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: '#212121'
            }}>
              אישור מסירה
            </h3>

            <img
              src={order.delivery_proof_url}
              alt="Delivery proof"
              style={{
                width: '100%',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
        `}
      </style>
    </div>
  );
}
