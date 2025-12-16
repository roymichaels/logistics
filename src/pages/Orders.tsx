import React, { useState, useEffect, useCallback, useMemo } from 'react';

import type { FrontendDataStore } from '../lib/frontendDataStore';
import { registerOrdersSubscriptions } from './subscriptionHelpers';
import {
  Order,
  Product,
  User,
  OrderEntryMode,
  Zone,
  InventoryRecord,
  InventoryLocation
} from '../data/types';
import { DmOrderParser } from '../components/DmOrderParser';
import { StorefrontOrderBuilder } from '../components/StorefrontOrderBuilder';
import { DraftOrderItem, ProductInventoryAvailability } from '../components/orderTypes';
import { DriverCandidate } from '../lib/dispatchService';
import { DispatchOrchestrator } from '../lib/dispatchOrchestrator';
import { Toast } from '../components/Toast';
import { colors, commonStyles } from '../styles/design-system';
import { ROYAL_STYLES, ROYAL_COLORS, getStatusColor } from '../styles/royalTheme';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';

interface OrdersProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

export function Orders({ dataStore, onNavigate }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const { t, translations } = useI18n();

  const theme = 
  const dispatchOrchestrator = useMemo(() => new DispatchOrchestrator(dataStore), [dataStore]);

  useEffect(() => {

      } else if (showCreateForm) {
        setShowCreateForm(false);
      } else {
        // Don't navigate back to dashboard, let bottom nav handle it
        return;
      }
    });

    // Only show back button when in detail views
    if (!selectedOrder && !showCreateForm) {

    }
  }, [selectedOrder, showCreateForm, onNavigate]);

  const loadData = useCallback(async () => {
    if (!dataStore) {
      return;
    }

    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const ordersList = await dataStore.listOrders?.({
        status: filter === 'all' ? undefined : filter,
        q: searchQuery || undefined
      }) || [];

      // 🔐 MILITARIZED FILTERING: Role-based order visibility
      let filteredOrders = ordersList;

      if (profile.role === 'sales') {
        // Sales: ONLY see orders they created
        filteredOrders = ordersList.filter(o => o.created_by === profile.telegram_id);
      } else if (profile.role === 'driver') {
        // Driver: ONLY see orders assigned to them
        filteredOrders = ordersList.filter(o => o.assigned_driver === profile.telegram_id);
      } else if (profile.role === 'warehouse') {
        // Warehouse: NO ACCESS to orders
        filteredOrders = [];
      }
      // Owner/Manager: See all orders (no filter)

      setOrders(filteredOrders);
    } catch (error) {
      logger.error('Failed to load orders:', error);

    } finally {
      setLoading(false);
    }
  }, [dataStore, filter, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!dataStore) {
      return;
    }

    const unsubscribe = registerOrdersSubscriptions(dataStore, () => {
      void loadData();
    });

    return unsubscribe;
  }, [dataStore, loadData]);

  const handleCreateOrder = () => {
    // Check permissions
    if (!user || !['owner', 'manager', 'sales'].includes(user.role)) {

      return;
    }

    setShowModeSelector(true);
  };

  if (loading) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyStateIcon}>⏳</div>
          <p style={commonStyles.emptyStateText}>{translations.phrases.loadingOrders}</p>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateOrderForm
        dataStore={dataStore}
        currentUser={user}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          loadData();
        }}
        theme={theme}
      />
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        dataStore={dataStore}
        onBack={() => setSelectedOrder(null)}
        onUpdate={loadData}
        theme={theme}
        currentUser={user}
        dispatchOrchestrator={dispatchOrchestrator}
      />
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Mode Selector Modal */}
      {showModeSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowModeSelector(false)}
        >
          <div
            style={{
              ...ROYAL_STYLES.card,
              maxWidth: '400px',
              width: '100%',
              padding: '32px',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              textAlign: 'center'
            }}>
              🎯 בחר סוג הזמנה
            </h2>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: ROYAL_COLORS.muted,
              textAlign: 'center'
            }}>
              איך תרצה ליצור את ההזמנה?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* DM Mode */}
              <button
                onClick={() => {

                  setShowModeSelector(false);
                  setShowCreateForm(true);
                }}
                style={{
                  padding: '20px',
                  background: ROYAL_COLORS.gradientPurple,
                  border: 'none',
                  borderRadius: '16px',
                  color: ROYAL_COLORS.textBright,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: ROYAL_COLORS.glowPurple
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurpleStrong;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurple;
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  הדבק מטלגרם
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  העתק הזמנה מהודעת לקוח
                </div>
              </button>

              {/* Storefront Mode */}
              <button
                onClick={() => {

                  setShowModeSelector(false);
                  setShowCreateForm(true);
                }}
                style={{
                  padding: '20px',
                  background: ROYAL_COLORS.secondary,
                  border: `2px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '16px',
                  color: ROYAL_COLORS.text,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  בחירת מוצרים
                </div>
                <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                  בנה הזמנה עם ממשק מוצרים
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={() => {

                  setShowModeSelector(false);
                }}
                style={{
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: ROYAL_COLORS.muted,
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '8px'
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>📦 הזמנות</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>ניהול והזמנות בזמן אמת</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="חיפוש לפי לקוח, טלפון או כתובת..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          ...ROYAL_STYLES.input,
          marginBottom: '20px',
          fontSize: '15px'
        }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
        {['all', 'new', 'assigned', 'enroute', 'delivered'].map((status) => (
          <button
            key={status}
            onClick={() => {

              setFilter(status);
            }}
            style={{
              padding: '10px 20px',
              border: `2px solid ${filter === status ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
              borderRadius: '20px',
              background: filter === status ? ROYAL_COLORS.accent + '20' : 'transparent',
              color: filter === status ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            {status === 'all' ? 'הכל' : status === 'new' ? 'חדש' : status === 'assigned' ? 'הוקצה' : status === 'enroute' ? 'בדרך' : 'נמסר'}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
          <p style={ROYAL_STYLES.emptyStateText}>לא נמצאו הזמנות</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => {

                setSelectedOrder(order);
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}

function OrderCard({ order, onClick }: {
  order: Order;
  onClick: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return ROYAL_COLORS.warning;
      case 'assigned': return ROYAL_COLORS.info;
      case 'enroute': return ROYAL_COLORS.accent;
      case 'delivered': return ROYAL_COLORS.success;
      case 'failed': return ROYAL_COLORS.crimson;
      default: return ROYAL_COLORS.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדש',
      assigned: 'הוקצה',
      enroute: 'בדרך',
      delivered: 'נמסר',
      failed: 'נכשל'
    };
    return labels[status] || status;
  };

  return (
    <div
      onClick={onClick}
      style={{
        ...ROYAL_STYLES.card,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = ROYAL_COLORS.shadowStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = ROYAL_COLORS.shadow;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: ROYAL_COLORS.text
          }}>
            {order.customer_name}
          </h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.5'
          }}>
            📞 {order.customer_phone}
          </p>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.5'
          }}>
            📍 {order.customer_address}
          </p>
        </div>

        <div style={{
          padding: '6px 12px',
          borderRadius: '12px',
          background: getStatusColor(order.status) + '20',
          border: `1px solid ${getStatusColor(order.status)}`,
          color: getStatusColor(order.status),
          fontSize: '12px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          marginRight: '12px'
        }}>
          {getStatusLabel(order.status)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${ROYAL_COLORS.cardBorder}` }}>
        <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
          🕒 {new Date(order.created_at).toLocaleString('he-IL')}
        </div>
        {order.total_amount && (
          <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
            ₪{order.total_amount.toLocaleString()}
          </div>
        )}
      </div>

      {order.assigned_driver && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: ROYAL_COLORS.info + '10',
          border: `1px solid ${ROYAL_COLORS.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: ROYAL_COLORS.info
        }}>
          🚗 נהג: {order.assigned_driver}
        </div>
      )}
    </div>
  );
}

function OrderDetail({
  order,
  dataStore,
  onBack,
  onUpdate,
  theme,
  currentUser,
  dispatchOrchestrator
}: {
  order: Order;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
  currentUser: User | null;
  dispatchOrchestrator: DispatchOrchestrator;
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [zoneOptions, setZoneOptions] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [candidates, setCandidates] = useState<DriverCandidate[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const canAssign = ['manager', 'dispatcher'].includes(currentUser?.role || '');
  const orderItems = order.items ?? [];

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    if (newStatus === 'assigned') {
      if (!canAssign) {

        return;
      }

      if (!dataStore.listZones || !dataStore.listDriverStatuses) {
        Toast.error('המערכת אינה תומכת בהקצאת הזמנות כרגע');
        return;
      }

      setIsAssigning(true);
      setAssignError(null);
      setSelectedDriver('');
      return;
    }

    try {
      await dataStore.updateOrder?.(order.id, { status: newStatus });

      onUpdate();
      onBack();
    } catch (error) {
      logger.error('Failed to update order:', error);

    }
  };

  useEffect(() => {
    if (!isAssigning) return;
    if (!dataStore.listZones) {
      setAssignError('לא ניתן לטעון רשימת אזורים.');
      return;
    }

    let cancelled = false;

    const fetchZones = async () => {
      try {
        const zones = await dataStore.listZones();
        if (cancelled) return;
        setZoneOptions(zones);
        if (zones.length > 0 && !selectedZone) {
          setSelectedZone(zones[0].id);
        }
      } catch (err) {
        logger.error('Failed to load zones for assignment', err);
        if (!cancelled) {
          setAssignError('שגיאה בטעינת רשימת האזורים');
        }
      }
    };

    fetchZones();
    return () => {
      cancelled = true;
    };
  }, [isAssigning, dataStore, selectedZone]);

  const loadCandidates = useCallback(async (zoneId: string) => {
    if (!zoneId) {
      setCandidates([]);
      setAssignError(null);
      return;
    }

    try {
      setAssignLoading(true);
      const drivers = await dispatchOrchestrator.getDriverCandidates(order, zoneId);
      setCandidates(drivers);
      setAssignError(drivers.length === 0 ? 'אין נהגים זמינים עם מלאי מתאים באזור זה' : null);
    } catch (err) {
      logger.error('Failed to load driver candidates', err);
      setAssignError('שגיאה בטעינת רשימת הנהגים');
    } finally {
      setAssignLoading(false);
    }
  }, [dispatchOrchestrator, orderItems, order]);

  useEffect(() => {
    if (isAssigning && selectedZone) {
      loadCandidates(selectedZone);
      setSelectedDriver('');
    }
  }, [isAssigning, selectedZone, loadCandidates]);

  const confirmAssignment = async () => {
    if (!selectedDriver) {
      Toast.error('בחר נהג לפני האישור');
      return;
    }

    try {
      setAssignLoading(true);
      const result = await dispatchOrchestrator.assignOrder(order, selectedZone || null);
      if (!result.success) {
        const reason = result.reason === 'no_candidates'
          ? 'אין נהגים זמינים באזור זה'
          : 'שגיאה בהקצאת ההזמנה. נסה שוב.';
        setAssignError(reason);
        return;
      }

      Toast.success('ההזמנה הוקצתה לנהג בהצלחה');
      onUpdate();
      onBack();
    } catch (err) {
      logger.error('Failed to assign order', err);
      setAssignError('שגיאה בהקצאת ההזמנה. נסה שוב.');
    } finally {
      setAssignLoading(false);
    }
  };

  const cancelAssignment = () => {
    setIsAssigning(false);
    setAssignError(null);
    setSelectedDriver('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return ROYAL_COLORS.warning;
      case 'assigned': return ROYAL_COLORS.info;
      case 'enroute': return ROYAL_COLORS.accent;
      case 'delivered': return ROYAL_COLORS.success;
      case 'failed': return ROYAL_COLORS.crimson;
      default: return ROYAL_COLORS.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדש',
      assigned: 'הוקצה',
      enroute: 'בדרך',
      delivered: 'נמסר',
      failed: 'נכשל'
    };
    return labels[status] || status;
  };

  return (
    <div style={{
      padding: '0',
      backgroundColor: ROYAL_COLORS.background,
      color: ROYAL_COLORS.text,
      minHeight: '100vh',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px',
        background: ROYAL_COLORS.gradientPrimary,
        borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: ROYAL_COLORS.textBright,
            fontSize: '16px',
            cursor: 'pointer',
            marginBottom: '12px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← חזרה
        </button>
        <h1 style={{
          margin: '0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.textBright
        }}>
          📦 פרטי הזמנה
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Status Badge */}
        <div style={{
          ...ROYAL_STYLES.card,
          marginBottom: '16px',
          padding: '16px',
          background: `${getStatusColor(order.status)}10`,
          border: `2px solid ${getStatusColor(order.status)}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            סטטוס הזמנה
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: getStatusColor(order.status)
          }}>
            {getStatusLabel(order.status)}
          </div>
        </div>

        {/* Customer Information */}
        <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: ROYAL_COLORS.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              👤
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: '700',
                color: ROYAL_COLORS.text
              }}>
                {order.customer_name}
              </h2>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                לקוח
              </div>
            </div>
          </div>

          {order.customer_phone && (
            <div style={{
              padding: '12px',
              background: ROYAL_COLORS.secondary,
              borderRadius: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  טלפון
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                  📞 {order.customer_phone}
                </div>
              </div>
              <a
                href={`tel:${order.customer_phone}`}
                style={{
                  padding: '8px 16px',
                  background: ROYAL_COLORS.gradientSuccess,
                  borderRadius: '10px',
                  color: ROYAL_COLORS.textBright,
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                חייג
              </a>
            </div>
          )}

          <div style={{
            padding: '12px',
            background: ROYAL_COLORS.secondary,
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
              כתובת משלוח
            </div>
            <div style={{ fontSize: '15px', color: ROYAL_COLORS.text, lineHeight: '1.5' }}>
              📍 {order.customer_address}
            </div>
          </div>
        </div>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📋</span>
              <span>פריטים בהזמנה</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orderItems.map((item, index) => {
                const itemName = (item as any).product_name || (item as any).name || 'פריט';
                const itemPrice = (item as any).price || 0;
                return (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: ROYAL_COLORS.secondary,
                    borderRadius: '10px',
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: ROYAL_COLORS.text,
                        marginBottom: '4px'
                      }}>
                        {itemName}
                      </div>
                      {itemPrice > 0 && (
                        <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                          ₪{itemPrice.toLocaleString()} × {item.quantity}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: ROYAL_COLORS.accent + '20',
                      borderRadius: '8px',
                      color: ROYAL_COLORS.accent,
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      ×{item.quantity}
                    </div>
                  </div>
                );
              })}
            </div>

            {order.total_amount && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `2px solid ${ROYAL_COLORS.cardBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.text }}>
                  סה"כ
                </span>
                <span style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
                  ₪{order.total_amount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Additional Information */}
        {(order.notes || order.eta) && (
          <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: ROYAL_COLORS.text
            }}>
              ℹ️ מידע נוסף
            </h3>

            {order.eta && (
              <div style={{
                padding: '12px',
                background: ROYAL_COLORS.secondary,
                borderRadius: '10px',
                marginBottom: order.notes ? '12px' : '0'
              }}>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  זמן הגעה משוער
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.info }}>
                  🕒 {new Date(order.eta).toLocaleString('he-IL')}
                </div>
              </div>
            )}

            {order.notes && (
              <div style={{
                padding: '12px',
                background: ROYAL_COLORS.secondary,
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  הערות
                </div>
                <div style={{ fontSize: '15px', color: ROYAL_COLORS.text, lineHeight: '1.6' }}>
                  💭 {order.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {order.status !== 'delivered' && order.status !== 'failed' && (
        <div style={{ padding: '16px' }}>
          <div style={{ ...ROYAL_STYLES.card, padding: '20px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: ROYAL_COLORS.text
            }}>
              ⚡ פעולות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.status === 'new' && canAssign && !isAssigning && (
                <button
                  onClick={() => handleStatusUpdate('assigned')}
                  style={{
                    padding: '16px',
                    background: ROYAL_COLORS.gradientPrimary,
                    color: ROYAL_COLORS.textBright,
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: ROYAL_COLORS.glowPurple,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurpleStrong;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurple;
                  }}
                >
                  🚚 הקצה הזמנה לנהג
                </button>
              )}

          {isAssigning && (
            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: `2px solid ${ROYAL_COLORS.accent}40`,
                backgroundColor: ROYAL_COLORS.secondary,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <h4 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '700',
                color: ROYAL_COLORS.text
              }}>
                🎯 בחירת אזור ונהג
              </h4>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  בחר אזור
                </label>
                <select
                  value={selectedZone}
                  onChange={(event) => setSelectedZone(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: `2px solid ${ROYAL_COLORS.cardBorder}`,
                    backgroundColor: ROYAL_COLORS.background,
                    color: ROYAL_COLORS.text,
                    fontSize: '15px',
                    fontWeight: '600'
                  }}
                >
                  <option value="">בחר אזור</option>
                  {zoneOptions.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              {assignError && (
                <div style={{
                  color: ROYAL_COLORS.crimson,
                  backgroundColor: `${ROYAL_COLORS.crimson}15`,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  border: `1px solid ${ROYAL_COLORS.crimson}40`
                }}>
                  ⚠️ {assignError}
                </div>
              )}

              {assignLoading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: ROYAL_COLORS.muted,
                  fontSize: '15px'
                }}>
                  ⏳ טוען נהגים זמינים…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {candidates.map((candidate) => {
                    const isSelected = selectedDriver === candidate.driverId;
                    const assignedZones = candidate.zones
                      .filter((assignment) => assignment.active)
                      .map((assignment) => assignment.zone?.name || assignment.zone_id)
                      .join(', ');

                    return (
                      <button
                        key={candidate.driverId}
                        onClick={() => {
                          setSelectedDriver(candidate.driverId);

                        }}
                        style={{
                          textAlign: 'right',
                          border: `2px solid ${isSelected ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
                          backgroundColor: isSelected ? `${ROYAL_COLORS.accent}15` : ROYAL_COLORS.background,
                          color: ROYAL_COLORS.text,
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            fontWeight: 700,
                            fontSize: '16px',
                            color: ROYAL_COLORS.text
                          }}>
                            🚗 נהג #{candidate.driverId}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: ROYAL_COLORS.gold,
                            fontWeight: '600',
                            padding: '4px 8px',
                            background: `${ROYAL_COLORS.gold}20`,
                            borderRadius: '6px'
                          }}>
                            ⭐ {Math.round(candidate.score)}
                          </div>
                        </div>
                        <div style={{
                          color: ROYAL_COLORS.muted,
                          fontSize: '14px',
                          marginBottom: '6px'
                        }}>
                          סטטוס: <span style={{ fontWeight: '600' }}>
                            {candidate.status.status === 'available' ? '🟢 זמין' :
                             candidate.status.status === 'delivering' ? '🚚 במשלוח' :
                             candidate.status.status === 'on_break' ? '☕ בהפסקה' :
                             '⚫ סיום משמרת'}
                          </span>
                        </div>
                        <div style={{
                          color: ROYAL_COLORS.info,
                          fontSize: '13px',
                          marginBottom: '4px',
                          fontWeight: '600'
                        }}>
                          📦 מלאי: {candidate.totalInventory} יחידות
                        </div>
                        {assignedZones && (
                          <div style={{
                            color: ROYAL_COLORS.muted,
                            fontSize: '12px',
                            marginTop: '6px',
                            paddingTop: '6px',
                            borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`
                          }}>
                            🗺️ אזורים: {assignedZones}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {candidates.length === 0 && !assignError && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: ROYAL_COLORS.muted,
                      fontSize: '14px'
                    }}>
                      ℹ️ אין נהגים זמינים באזור שנבחר
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={confirmAssignment}
                  disabled={!selectedDriver || assignLoading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: selectedDriver ? ROYAL_COLORS.gradientSuccess : ROYAL_COLORS.secondary,
                    color: selectedDriver ? ROYAL_COLORS.textBright : ROYAL_COLORS.muted,
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: selectedDriver && !assignLoading ? 'pointer' : 'not-allowed',
                    opacity: selectedDriver && !assignLoading ? 1 : 0.6,
                    boxShadow: selectedDriver ? ROYAL_COLORS.glowGreen : 'none'
                  }}
                >
                  ✅ אשר הקצאה
                </button>
                <button
                  onClick={cancelAssignment}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${ROYAL_COLORS.cardBorder}`,
                    backgroundColor: 'transparent',
                    color: ROYAL_COLORS.text,
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ❌ בטל
                </button>
              </div>
            </div>
          )}

          {order.status === 'assigned' && (
            <button
              onClick={() => handleStatusUpdate('enroute')}
              style={{
                padding: '16px',
                background: ROYAL_COLORS.gradientInfo,
                color: ROYAL_COLORS.textBright,
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: ROYAL_COLORS.glowBlue
              }}
            >
              🚚 סמן כ"בדרך"
            </button>
          )}

          {order.status === 'enroute' && (
            <button
              onClick={() => handleStatusUpdate('delivered')}
              style={{
                padding: '16px',
                background: ROYAL_COLORS.gradientSuccess,
                color: ROYAL_COLORS.textBright,
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: ROYAL_COLORS.glowGreen
              }}
            >
              ✅ סמן כנמסר
            </button>
          )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOrderForm({ dataStore, currentUser, onCancel, onSuccess, theme }: {
  dataStore: DataStore;
  currentUser: User | null;
  onCancel: () => void;
  onSuccess: () => void;
  theme: any;
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
    deliveryDate: ''
  });
  const [activeMode, setActiveMode] = useState<OrderEntryMode>('dm');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dmState, setDmState] = useState<{ items: DraftOrderItem[]; errors: string[]; rawText: string }>({
    items: [],
    errors: [],
    rawText: ''
  });
  const [storefrontItems, setStorefrontItems] = useState<DraftOrderItem[]>([]);
  const enforceInventoryChecks = Boolean(
    dataStore.listInventory && dataStore.listInventoryLocations
  );

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      if (!dataStore.listProducts) {
        setProductsLoading(false);
        return;
      }

      try {
        const list = await dataStore.listProducts();
        if (isMounted) {
          setProducts(list);
        }
      } catch (error) {
        logger.error('Failed to load products for order creation', error);
        if (isMounted) {
          setProductsError('שגיאה בטעינת רשימת המוצרים');
        }
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [dataStore]);

  useEffect(() => {
    let isMounted = true;

    if (!enforceInventoryChecks) {
      setInventoryLoading(false);
      setInventoryError(null);
      setInventoryRecords([]);
      setInventoryLocations([]);
      return () => {
        isMounted = false;
      };
    }

    const loadInventory = async () => {
      try {
        setInventoryLoading(true);
        const [records, locations] = await Promise.all([
          dataStore.listInventory?.() ?? [],
          dataStore.listInventoryLocations?.() ?? []
        ]);

        if (isMounted) {
          setInventoryRecords(records);
          setInventoryLocations(locations);
          setInventoryError(null);
        }
      } catch (error) {
        logger.error('Failed to load inventory for order creation', error);
        if (isMounted) {
          setInventoryError('שגיאה בטעינת נתוני המלאי');
        }
      } finally {
        if (isMounted) {
          setInventoryLoading(false);
        }
      }
    };

    loadInventory();

    return () => {
      isMounted = false;
    };
  }, [dataStore, enforceInventoryChecks]);

  const inventoryAvailability = useMemo(() => {
    const map: Record<string, ProductInventoryAvailability> = {};
    const locationNames = new Map(
      inventoryLocations.map(location => [location.id, location.name])
    );

    inventoryRecords.forEach(record => {
      const available = Math.max(
        0,
        (record.on_hand_quantity ?? 0) - (record.reserved_quantity ?? 0)
      );

      if (!map[record.product_id]) {
        map[record.product_id] = {
          totalAvailable: 0,
          byLocation: []
        };
      }

      map[record.product_id].totalAvailable += available;
      map[record.product_id].byLocation.push({
        locationId: record.location_id,
        locationName:
          record.location?.name || locationNames.get(record.location_id) || record.location_id,
        available
      });
    });

    Object.values(map).forEach(entry => {
      entry.byLocation.sort((a, b) => b.available - a.available);
    });

    return map;
  }, [inventoryRecords, inventoryLocations]);

  const activeItems = activeMode === 'dm' ? dmState.items : storefrontItems;
  const totalAmount = activeItems.reduce(
    (sum, item) => sum + item.quantity * (item.product.price || 0),
    0
  );
  const inventoryIssues = useMemo(() => {
    if (!enforceInventoryChecks) {
      return [];
    }

    const issues: string[] = [];

    activeItems.forEach(item => {
      const availability = inventoryAvailability[item.product.id];

      if (!availability || availability.totalAvailable <= 0) {
        issues.push(`אין מלאי זמין עבור ${item.product.name}.`);
        return;
      }

      if (!item.source_location) {
        issues.push(`בחר מקור מלאי עבור ${item.product.name}.`);
        return;
      }

      const selectedLocation = availability.byLocation.find(
        location => location.locationId === item.source_location
      );

      if (!selectedLocation) {
        issues.push(`המיקום שנבחר עבור ${item.product.name} אינו קיים במלאי.`);
        return;
      }

      if (selectedLocation.available < item.quantity) {
        issues.push(
          `${item.product.name}: קיימות ${selectedLocation.available} יחידות בלבד במיקום שנבחר.`
        );
      }
    });

    return issues;
  }, [activeItems, inventoryAvailability, enforceInventoryChecks]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.customerName || !formData.customerAddress || !formData.customerPhone) {

      return;
    }

    if (activeItems.length === 0) {

      return;
    }

    if (activeMode === 'dm' && dmState.errors.length > 0) {

      return;
    }

    if (enforceInventoryChecks && inventoryLoading) {

      return;
    }

    if (enforceInventoryChecks && inventoryError) {

      return;
    }

    if (enforceInventoryChecks && inventoryIssues.length > 0) {

      return;
    }

    setLoading(true);

    try {
      await dataStore.createOrder?.({
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        notes: formData.notes || undefined,
        delivery_date: formData.deliveryDate || undefined,
        entry_mode: activeMode,
        salesperson_id: currentUser?.telegram_id,
        raw_order_text: activeMode === 'dm' ? dmState.rawText : undefined,
        items: activeItems.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          source_location: item.source_location
        })),
        total_amount: totalAmount,
        status: 'new'
      });

      onSuccess();
    } catch (error) {
      logger.error('Failed to create order:', error);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '600'
        }}>
          יצירת הזמנה חדשה
        </h1>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.link_color || theme.button_color,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ביטול
        </button>
      </div>

      <form id="create-order-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section style={{
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>פרטי לקוח</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>שם לקוח *</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={event => setFormData({ ...formData, customerName: event.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontSize: '15px'
                }}
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>טלפון לקוח *</label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={event => setFormData({ ...formData, customerPhone: event.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontSize: '15px'
                }}
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>כתובת מסירה *</label>
              <textarea
                value={formData.customerAddress}
                onChange={event => setFormData({ ...formData, customerAddress: event.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontSize: '15px',
                  resize: 'vertical'
                }}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600 }}>תאריך אספקה</label>
              <input
                type="datetime-local"
                value={formData.deliveryDate}
                onChange={event => setFormData({ ...formData, deliveryDate: event.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontSize: '15px'
                }}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 600 }}>הערות להזמנה</label>
              <textarea
                value={formData.notes}
                onChange={event => setFormData({ ...formData, notes: event.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontSize: '15px',
                  resize: 'vertical'
                }}
                disabled={loading}
              />
            </div>
          </div>
        </section>

        <section style={{
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Sales Intake</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { mode: 'dm', label: 'DM הזמנה' },
                { mode: 'storefront', label: 'בחירת מוצרים' }
              ] as Array<{ mode: OrderEntryMode; label: string }>).map(option => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setActiveMode(option.mode)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    backgroundColor: activeMode === option.mode ? theme.button_color : theme.bg_color,
                    color: activeMode === option.mode ? theme.button_text_color : theme.text_color
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {productsLoading ? (
            <div style={{ textAlign: 'center', color: theme.hint_color }}>טוען קטלוג מוצרים…</div>
          ) : productsError ? (
            <div style={{
              color: '#ff3b30',
              backgroundColor: '#ff3b3020',
              padding: '12px',
              borderRadius: '8px'
            }}>
              {productsError}
            </div>
          ) : enforceInventoryChecks && inventoryLoading ? (
            <div style={{ textAlign: 'center', color: theme.hint_color }}>טוען נתוני מלאי…</div>
          ) : enforceInventoryChecks && inventoryError ? (
            <div style={{
              color: '#ff3b30',
              backgroundColor: '#ff3b3020',
              padding: '12px',
              borderRadius: '8px'
            }}>
              {inventoryError}
            </div>
          ) : activeMode === 'dm' ? (
            <DmOrderParser
              products={products}
              theme={theme}
              inventoryAvailability={inventoryAvailability}
              onChange={(items, context) => setDmState({
                items,
                errors: context.errors,
                rawText: context.rawText
              })}
            />
          ) : (
            <StorefrontOrderBuilder
              products={products}
              value={storefrontItems}
              theme={theme}
              inventoryAvailability={inventoryAvailability}
              onChange={setStorefrontItems}
            />
          )}
        </section>

        <section style={{
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>סיכום הזמנה</h2>
          {activeItems.length === 0 ? (
            <div style={{ color: theme.hint_color }}>התחילו להוסיף פריטים מהטאב למעלה.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeItems.map(item => (
                <div
                  key={item.draftId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: theme.bg_color
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600, color: theme.text_color }}>{item.product.name}</span>
                    <span style={{ fontSize: '12px', color: theme.hint_color }}>
                      ₪{item.product.price.toLocaleString()} × {item.quantity}
                    </span>
                    {(() => {
                      const availability = inventoryAvailability[item.product.id];
                      const selectedLocation = availability?.byLocation.find(
                        location => location.locationId === item.source_location
                      );
                      const locationName = selectedLocation?.locationName
                        || (item.source_location ? `מיקום ${item.source_location}` : 'לא נבחר');
                      const locationDetail = selectedLocation
                        ? `זמין ${selectedLocation.available}`
                        : availability
                          ? `סה"כ זמין ${availability.totalAvailable}`
                          : 'אין נתוני מלאי';
                      const warning =
                        !selectedLocation ||
                        !item.source_location ||
                        selectedLocation.available < item.quantity;

                      return (
                        <span
                          style={{
                            fontSize: '12px',
                            color: warning ? '#ff9500' : theme.hint_color
                          }}
                        >
                          מקור: {locationName} ({locationDetail})
                        </span>
                      );
                    })()}
                  </div>
                  <span style={{ fontWeight: 600, color: theme.text_color }}>
                    ₪{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              {enforceInventoryChecks && inventoryIssues.length > 0 && (
                <div
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #ff950040',
                    backgroundColor: '#ff950020',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    color: '#a15c00',
                    fontSize: '13px'
                  }}
                >
                  {inventoryIssues.map((issue, index) => (
                    <span key={index}>{issue}</span>
                  ))}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: `1px solid ${theme.hint_color}30`,
                  fontSize: '18px',
                  fontWeight: 700
                }}
              >
                <span>סה"כ</span>
                <span>₪{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </section>
      </form>
    </div>
  );
}

// Enhanced Order Detail with Chat Integration
function OrderDetailEnhanced({
  order,
  dataStore,
  onBack,
  onUpdate,
  currentUser,
  onNavigate
}: {
  order: Order;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  currentUser: User | null;
  onNavigate: (page: string) => void;
}) {
  const [assignedDriver, setAssignedDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverInfo();
  }, [order.assigned_driver]);

  const loadDriverInfo = async () => {
    if (!order.assigned_driver) {
      setLoading(false);
      return;
    }

    try {
      // In a real app, you'd fetch driver details from dataStore
      setAssignedDriver({
        telegram_id: order.assigned_driver,
        name: 'נהג',
        role: 'driver'
      } as User);
    } catch (error) {
      logger.error('Failed to load driver info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (userId: string, userName: string) => {
    // Navigate to chat with pre-selected user
    // You would implement creating a direct chat here

    // In production: create direct chat and navigate to it
    onNavigate('chat');
  };

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      await dataStore.updateOrder?.(order.id, { status: newStatus });
      
      // Send notification if driver is assigned
      if (order.assigned_driver && dataStore.createNotification) {
        const statusMessages: Record<string, string> = {
          confirmed: 'ההזמנה אושרה',
          preparing: 'ההזמנה בהכנה',
          ready: 'ההזמנה מוכנה למשלוח',
          out_for_delivery: 'זמן לצאת למשלוח!',
          delivered: 'תודה על המשלוח!',
          cancelled: 'ההזמנה בוטלה'
        };

        await dataStore.createNotification({
          recipient_id: order.assigned_driver,
          title: 'עדכון סטטוס הזמנה',
          message: statusMessages[newStatus] || 'סטטוס ההזמנה עודכן',
          type: 'order_assigned',
          action_url: `/orders/${order.id}`
        });
      }

      onUpdate();
      onBack();
    } catch (error) {
      logger.error('Failed to update order:', error);

    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: ROYAL_COLORS.background,
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: ROYAL_COLORS.accent,
            fontSize: '16px',
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← חזרה
        </button>

        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textShadow: '0 0 20px rgba(29, 155, 240, 0.5)'
        }}>
          📦 פרטי הזמנה
        </h1>

        {/* Order Info Card */}
        <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                {order.customer_name}
              </h2>
              <p style={{ margin: '0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                📍 {order.customer_address}
              </p>
            </div>
            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: `${ROYAL_COLORS.emerald}20`,
              color: ROYAL_COLORS.emerald,
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {order.status}
            </div>
          </div>

          {order.customer_phone && (
            <div style={{
              padding: '12px',
              background: ROYAL_COLORS.card,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ color: ROYAL_COLORS.muted, fontSize: '12px', marginBottom: '4px' }}>
                טלפון לקוח
              </div>
              <div style={{ color: ROYAL_COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                📞 {order.customer_phone}
              </div>
            </div>
          )}
        </div>

        {/* Assigned Driver Section */}
        {assignedDriver && (
          <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: ROYAL_COLORS.text
            }}>
              🚚 נהג משויך
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '4px' }}>
                  {assignedDriver.name}
                </div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                  {assignedDriver.telegram_id}
                </div>
              </div>
              <button
                onClick={() => handleStartChat(assignedDriver.telegram_id, assignedDriver.name)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${ROYAL_COLORS.accent}40`,
                  background: `${ROYAL_COLORS.accent}15`,
                  color: ROYAL_COLORS.accent,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                <span>💬</span>
                <span>שלח הודעה</span>
              </button>
            </div>
          </div>
        )}

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: ROYAL_COLORS.text
            }}>
              📋 פריטים בהזמנה
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {order.items.map((item: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: index < order.items!.length - 1 ? `1px solid ${ROYAL_COLORS.cardBorder}` : 'none'
                }}>
                  <span style={{ color: ROYAL_COLORS.text }}>
                    {item.product_name || item.name || 'פריט'}
                  </span>
                  <span style={{ color: ROYAL_COLORS.muted }}>
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Actions */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && currentUser && (
          <div style={{ ...ROYAL_STYLES.card }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: ROYAL_COLORS.text
            }}>
              ⚡ פעולות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentUser.role === 'driver' && order.status === 'ready' && (
                <button
                  onClick={() => handleStatusUpdate('out_for_delivery')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
                  }}
                >
                  🚚 התחל משלוח
                </button>
              )}
              {currentUser.role === 'driver' && order.status === 'out_for_delivery' && (
                <button
                  onClick={() => handleStatusUpdate('delivered')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${ROYAL_COLORS.emerald} 0%, #059669 100%)`,
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ✅ סמן כנמסר
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
