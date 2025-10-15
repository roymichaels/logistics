import React, { useState, useEffect, useMemo } from 'react';
import { Order, DataStore, User } from '../data/types';
import { ORDER_STATUS_COLORS } from '../styles/orderTheme';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';
import { deliverOrder } from '../services/inventory';

interface DriverOrderFulfillmentProps {
  dataStore: DataStore;
  currentUser: User;
  onNavigate: (page: string) => void;
}

interface OrderWithDistance extends Order {
  distance?: number;
  routeOrder?: number;
}

export function DriverOrderFulfillment({
  dataStore,
  currentUser,
  onNavigate
}: DriverOrderFulfillmentProps) {
  const [orders, setOrders] = useState<OrderWithDistance[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await dataStore.listOrders?.() || [];

      // Filter orders assigned to this driver
      const myOrders = allOrders.filter(o =>
        o.assigned_driver === currentUser.telegram_id &&
        o.status !== 'delivered' &&
        o.status !== 'cancelled'
      );

      // Sort by status priority and created date
      const sortedOrders = myOrders.sort((a, b) => {
        const statusPriority: Record<string, number> = {
          'ready': 1,
          'out_for_delivery': 2,
          'confirmed': 3,
          'preparing': 4
        };

        const aPriority = statusPriority[a.status] || 99;
        const bPriority = statusPriority[b.status] || 99;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setOrders(sortedOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      Toast.error('שגיאה בטעינת המשלוחים');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'out_for_delivery'), [orders]);
  const readyOrders = useMemo(() => orders.filter(o => o.status === 'ready'), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => ['confirmed', 'preparing'].includes(o.status)), [orders]);

  const todayRevenue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders
      .filter(o => o.status === 'delivered' && new Date(o.delivered_at || 0) >= today)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [orders]);

  const handleStartDelivery = async (order: OrderWithDistance) => {
    try {
      await dataStore.updateOrder?.(order.id, { status: 'out_for_delivery' });
      telegram.hapticFeedback('notification', 'success');
      Toast.success('משלוח התחיל!');
      await loadOrders();
    } catch (error) {
      console.error('Failed to start delivery:', error);
      Toast.error('שגיאה בהתחלת משלוח');
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    if (!proofImage) {
      Toast.error('נא לצלם אישור מסירה');
      return;
    }

    setUploadingProof(true);
    try {
      const response = await deliverOrder({
        orderId,
        proofUrl: proofImage,
      });

      if (!response.success) {
        throw new Error('המערכת לא הצליחה לעדכן את המשלוח');
      }

      telegram.hapticFeedback('notification', 'success');
      Toast.success('משלוח הושלם בהצלחה! 🎉');

      setSelectedOrder(null);
      setProofImage(null);
      await loadOrders();
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      const message = error instanceof Error ? error.message : 'שגיאה בסיום משלוח';
      Toast.error(message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCaptureProof = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setProofImage(event.target?.result as string);
          Toast.success('תמונה נשמרה');
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(url, '_blank');
    telegram.hapticFeedback('impact', 'medium');
  };

  const callCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
    telegram.hapticFeedback('selection');
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
          <div style={{ fontSize: '16px', color: '#666' }}>טוען משלוחים...</div>
        </div>
      </div>
    );
  }

  // Detail View
  if (selectedOrder) {
    const statusConfig = ORDER_STATUS_COLORS[selectedOrder.status];

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
        paddingBottom: '100px'
      }}>
        {/* Header */}
        <div style={{
          background: statusConfig.gradient,
          padding: '20px',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={() => setSelectedOrder(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              color: '#FFFFFF',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              fontSize: '14px'
            }}
          >
            ← חזור
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>{statusConfig.icon}</div>
            <div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
                {selectedOrder.customer_name}
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                הזמנה #{selectedOrder.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Customer Info Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
              📍 פרטי משלוח
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>כתובת</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                {selectedOrder.customer_address}
              </div>

              <button
                onClick={() => openNavigation(selectedOrder.customer_address)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #42A5F5 0%, #1976D2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(66, 165, 245, 0.3)'
                }}
              >
                🗺️ ניווט עם Google Maps
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>טלפון לקוח</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                {selectedOrder.customer_phone}
              </div>

              <button
                onClick={() => callCustomer(selectedOrder.customer_phone)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(102, 187, 106, 0.3)'
                }}
              >
                📞 התקשר ללקוח
              </button>
            </div>

            {selectedOrder.notes && (
              <div style={{
                padding: '12px',
                background: '#FFF3E0',
                borderRadius: '12px',
                border: '2px solid #FFB74D'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#E65100', marginBottom: '4px' }}>
                  📝 הערות מיוחדות
                </div>
                <div style={{ fontSize: '14px', color: '#E65100' }}>
                  {selectedOrder.notes}
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          {selectedOrder.items && selectedOrder.items.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
                📦 פריטים למסירה
              </h3>

              {selectedOrder.items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '12px',
                    marginBottom: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {item.product_name || item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      כמות: {item.quantity}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#9c6dff'
                  }}>
                    ₪{((item.price || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '2px solid #E0E0E0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                <span>סה״כ לגביה:</span>
                <span style={{ color: '#9c6dff' }}>
                  ₪{selectedOrder.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Delivery Proof */}
          {selectedOrder.status === 'out_for_delivery' && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
                📸 אישור מסירה
              </h3>

              {!proofImage ? (
                <button
                  onClick={handleCaptureProof}
                  style={{
                    width: '100%',
                    padding: '60px 20px',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e9f0 100%)',
                    border: '3px dashed #9c6dff',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#9c6dff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '48px' }}>📷</div>
                  <div>צלם אישור מסירה</div>
                </button>
              ) : (
                <div>
                  <img
                    src={proofImage}
                    alt="Delivery proof"
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      marginBottom: '12px'
                    }}
                  />

                  <button
                    onClick={handleCaptureProof}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#FFFFFF',
                      border: '2px solid #E0E0E0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    📷 צלם שוב
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Actions */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '1px solid #E0E0E0',
          padding: '16px 20px',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          {selectedOrder.status === 'ready' && (
            <button
              onClick={() => handleStartDelivery(selectedOrder)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 187, 106, 0.3)'
              }}
            >
              🚚 התחל משלוח
            </button>
          )}

          {selectedOrder.status === 'out_for_delivery' && (
            <button
              onClick={() => handleCompleteDelivery(selectedOrder.id)}
              disabled={!proofImage || uploadingProof}
              style={{
                width: '100%',
                padding: '16px',
                background: !proofImage || uploadingProof
                  ? '#CCCCCC'
                  : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '18px',
                cursor: !proofImage || uploadingProof ? 'not-allowed' : 'pointer',
                boxShadow: !proofImage || uploadingProof ? 'none' : '0 4px 12px rgba(76, 175, 80, 0.3)'
              }}
            >
              {uploadingProof ? '⏳ שולח...' : '✅ סיום משלוח'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
      paddingBottom: '40px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
        padding: '24px 20px',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(102, 187, 106, 0.3)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
          🚚 המשלוחים שלי
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          {orders.length} משלוחים פעילים
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginTop: '16px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{activeOrders.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>בדרך</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{readyOrders.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>מוכן</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>₪{Math.round(todayRevenue).toLocaleString()}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>היום</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {orders.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✨</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#212121', marginBottom: '8px' }}>
              אין משלוחים פעילים
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              כל המשלוחים הושלמו!
            </div>
          </div>
        ) : (
          <>
            {/* Active Deliveries */}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#212121' }}>
                  🚚 במשלוח ({activeOrders.length})
                </h2>

                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}

            {/* Ready for Pickup */}
            {readyOrders.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#212121' }}>
                  🎁 מוכן לאיסוף ({readyOrders.length})
                </h2>

                {readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}

            {/* Preparing */}
            {preparingOrders.length > 0 && (
              <div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700', color: '#212121' }}>
                  📦 בהכנה ({preparingOrders.length})
                </h2>

                {preparingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick }: {
  order: Order;
  onClick: () => void;
}) {
  const statusConfig = ORDER_STATUS_COLORS[order.status];

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        border: `2px solid ${statusConfig.border}`,
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#212121' }}>
            {order.customer_name}
          </h3>

          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
            📍 {order.customer_address}
          </div>

          <div style={{ fontSize: '14px', color: '#666' }}>
            📞 {order.customer_phone}
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '10px',
            background: statusConfig.bg,
            color: statusConfig.text,
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '8px',
            whiteSpace: 'nowrap'
          }}>
            {statusConfig.icon} {order.status}
          </div>

          <div style={{ fontSize: '18px', fontWeight: '700', color: '#9c6dff' }}>
            ₪{order.total_amount.toLocaleString()}
          </div>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <div style={{
          fontSize: '13px',
          color: '#999',
          paddingTop: '8px',
          borderTop: '1px solid #E0E0E0'
        }}>
          {order.items.length} פריטים
        </div>
      )}
    </div>
  );
}
