import React, { useState, useEffect, useCallback } from 'react';
import { DataStore } from '../data/types';
import { Toast } from './Toast';

import { logger } from '../lib/logger';

interface MarketplaceOrder {
  id: string;
  order_id: string;
  business_id: string;
  business_name?: string;
  pickup_address: string;
  delivery_address: string;
  estimated_distance_km: number;
  delivery_fee: number;
  driver_earnings: number;
  customer_name: string;
  order_total: number;
  expires_at: string;
  items_count: number;
  created_at: string;
}

interface DriverOrderMarketplaceProps {
  dataStore: DataStore;
  driverProfileId: string;
  onOrderAccepted?: (orderId: string) => void;
}

export function DriverOrderMarketplace({
  dataStore,
  driverProfileId,
  onOrderAccepted
}: DriverOrderMarketplaceProps) {

  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'nearby' | 'high-pay'>('all');
  const supabase = (dataStore as any).supabase;

  const loadMarketplaceOrders = useCallback(async () => {
    try {
      const { data: marketplaceData, error } = await supabase
        .from('order_marketplace')
        .select(`
          *,
          orders:order_id (
            id,
            customer_name,
            customer_address,
            total_amount,
            items,
            created_at
          ),
          businesses:business_id (
            name,
            name_hebrew
          )
        `)
        .eq('is_active', true)
        .is('assigned_driver_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders: MarketplaceOrder[] = (marketplaceData || []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        business_id: item.business_id,
        business_name: item.businesses?.name_hebrew || item.businesses?.name,
        pickup_address: 'נקודת איסוף',
        delivery_address: item.orders?.customer_address || 'כתובת משלוח',
        estimated_distance_km: item.estimated_distance_km || 0,
        delivery_fee: parseFloat(item.delivery_fee || 0),
        driver_earnings: parseFloat(item.driver_earnings || 0),
        customer_name: item.orders?.customer_name || 'לקוח',
        order_total: parseFloat(item.orders?.total_amount || 0),
        expires_at: item.expires_at,
        items_count: Array.isArray(item.orders?.items) ? item.orders.items.length : 0,
        created_at: item.created_at
      }));

      setOrders(formattedOrders);
    } catch (error) {
      logger.error('Failed to load marketplace orders:', error);
      Toast.error('שגיאה בטעינת הזמנות זמינות');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadMarketplaceOrders();

    const interval = setInterval(loadMarketplaceOrders, 10000);

    const subscription = supabase
      .channel('marketplace-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_marketplace',
          filter: 'is_active=eq.true'
        },
        () => {
          loadMarketplaceOrders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [loadMarketplaceOrders, supabase]);

  const handleAcceptOrder = async (marketplaceOrderId: string, orderId: string) => {
    haptic.impactOccurred('medium');
    setAccepting(marketplaceOrderId);

    try {
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('id, user_id, current_latitude, current_longitude, current_order_count')
        .eq('id', driverProfileId)
        .single();

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      const { error: logError } = await supabase
        .from('order_acceptance_log')
        .insert({
          order_marketplace_id: marketplaceOrderId,
          driver_profile_id: driverProfileId,
          action: 'accepted',
          driver_latitude: driverProfile.current_latitude,
          driver_longitude: driverProfile.current_longitude,
          current_order_count: driverProfile.current_order_count
        });

      if (logError) throw logError;

      const { error: marketplaceError } = await supabase
        .from('order_marketplace')
        .update({
          assigned_driver_id: driverProfileId,
          assigned_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', marketplaceOrderId);

      if (marketplaceError) throw marketplaceError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          assigned_driver: driverProfile.user_id,
          status: 'confirmed',
          assigned_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          current_order_count: (driverProfile.current_order_count || 0) + 1
        })
        .eq('id', driverProfileId);

      if (profileError) throw profileError;

      haptic.notificationOccurred('success');
      Toast.success('ההזמנה התקבלה בהצלחה!');
      loadMarketplaceOrders();
      onOrderAccepted?.(orderId);
    } catch (error) {
      logger.error('Failed to accept order:', error);
      haptic.notificationOccurred('error');
      Toast.error('שגיאה בקבלת ההזמנה');
    } finally {
      setAccepting(null);
    }
  };

  const handleDeclineOrder = async (marketplaceOrderId: string) => {
    haptic.impactOccurred('light');

    try {
      await supabase
        .from('order_acceptance_log')
        .insert({
          order_marketplace_id: marketplaceOrderId,
          driver_profile_id: driverProfileId,
          action: 'declined',
          decline_reason: 'manual_decline'
        });

      setOrders(prev => prev.filter(o => o.id !== marketplaceOrderId));
      Toast.info('ההזמנה הוסרה מהרשימה');
    } catch (error) {
      logger.error('Failed to log decline:', error);
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return 'פג תוקף';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'nearby') {
      return order.estimated_distance_km <= 5;
    }
    if (filter === 'high-pay') {
      return order.driver_earnings >= 30;
    }
    return true;
  });

  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: bgColor,
        color: textColor
      }}>
        <div style={{ fontSize: '16px' }}>טוען הזמנות זמינות...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh', paddingBottom: '20px' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        backgroundColor: bgColor,
        zIndex: 10
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0', color: textColor }}>
          הזמנות זמינות ({filteredOrders.length})
        </h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: filter === 'all' ? 'none' : '1px solid rgba(0,0,0,0.2)',
              backgroundColor: filter === 'all' ? buttonColor : 'transparent',
              color: filter === 'all' ? buttonTextColor : textColor,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            הכל
          </button>
          <button
            onClick={() => setFilter('nearby')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: filter === 'nearby' ? 'none' : '1px solid rgba(0,0,0,0.2)',
              backgroundColor: filter === 'nearby' ? buttonColor : 'transparent',
              color: filter === 'nearby' ? buttonTextColor : textColor,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            קרוב
          </button>
          <button
            onClick={() => setFilter('high-pay')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: filter === 'high-pay' ? 'none' : '1px solid rgba(0,0,0,0.2)',
              backgroundColor: filter === 'high-pay' ? buttonColor : 'transparent',
              color: filter === 'high-pay' ? buttonTextColor : textColor,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            תשלום גבוה
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: textColor,
            opacity: 0.6
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              אין הזמנות זמינות כרגע
            </div>
            <div style={{ fontSize: '14px' }}>
              הזמנות חדשות יופיעו כאן באופן אוטומטי
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map(order => (
              <div
                key={order.id}
                style={{
                  backgroundColor: theme.secondary_bg_color || '#f5f5f5',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor, marginBottom: '4px' }}>
                      {order.business_name}
                    </div>
                    <div style={{ fontSize: '14px', color: textColor, opacity: 0.7 }}>
                      {order.customer_name} • {order.items_count} פריטים
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ₪{order.driver_earnings.toFixed(0)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '14px',
                  color: textColor
                }}>
                  <div style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ opacity: 0.6, fontSize: '12px', marginBottom: '4px' }}>מרחק</div>
                    <div style={{ fontWeight: 'bold' }}>~{order.estimated_distance_km.toFixed(1)} ק"מ</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ opacity: 0.6, fontSize: '12px', marginBottom: '4px' }}>סה"כ הזמנה</div>
                    <div style={{ fontWeight: 'bold' }}>₪{order.order_total.toFixed(0)}</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ opacity: 0.6, fontSize: '12px', marginBottom: '4px' }}>זמן</div>
                    <div style={{ fontWeight: 'bold', color: '#dc2626' }}>
                      {getTimeRemaining(order.expires_at)}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '13px',
                  color: textColor,
                  opacity: 0.7,
                  marginBottom: '12px',
                  lineHeight: '1.4'
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    📍 {order.delivery_address}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDeclineOrder(order.id)}
                    disabled={accepting === order.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.2)',
                      backgroundColor: 'transparent',
                      color: textColor,
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      opacity: accepting === order.id ? 0.5 : 1
                    }}
                  >
                    לא מתאים
                  </button>
                  <button
                    onClick={() => handleAcceptOrder(order.id, order.order_id)}
                    disabled={accepting !== null}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: buttonColor,
                      color: buttonTextColor,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      opacity: accepting !== null ? 0.5 : 1
                    }}
                  >
                    {accepting === order.id ? 'מקבל...' : 'קבל הזמנה'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
