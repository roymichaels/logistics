import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Order, Product, User, OrderEntryMode, Zone } from '../data/types';
import { DmOrderParser, DraftOrderItem } from '../src/components/DmOrderParser';
import { StorefrontOrderBuilder } from '../src/components/StorefrontOrderBuilder';
import { DispatchService, DriverCandidate } from '../src/lib/dispatchService';
import { Toast } from '../src/components/Toast';

interface OrdersProps {
  dataStore: DataStore;
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

  const theme = telegram.themeParams;
  const dispatchService = useMemo(() => new DispatchService(dataStore), [dataStore]);

  useEffect(() => {
    loadData();
  }, [filter, searchQuery]);

  useEffect(() => {
    telegram.setBackButton(() => {
      if (selectedOrder) {
        setSelectedOrder(null);
      } else if (showCreateForm) {
        setShowCreateForm(false);
      } else {
        // Don't navigate back to dashboard, let bottom nav handle it
        return;
      }
    });

    // Only show back button when in detail views
    if (!selectedOrder && !showCreateForm) {
      telegram.hideBackButton();
    }
  }, [selectedOrder, showCreateForm, onNavigate]);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const ordersList = await dataStore.listOrders?.({
        status: filter === 'all' ? undefined : filter,
        q: searchQuery || undefined
      }) || [];
      
      setOrders(ordersList);
    } catch (error) {
      console.error('Failed to load orders:', error);
      telegram.showAlert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    // Check permissions
    if (!user || !['manager', 'sales'].includes(user.role)) {
      telegram.showAlert('אין לך הרשאה ליצור הזמנות');
      return;
    }
    
    telegram.hapticFeedback('selection');
    setShowCreateForm(true);
  };

  useEffect(() => {
    if (user?.role === 'dispatcher' && !selectedOrder && !showCreateForm) {
      telegram.setMainButton('Create Order', handleCreateOrder);
    } else if (['manager', 'sales'].includes(user?.role || '') && !selectedOrder && !showCreateForm) {
      telegram.setMainButton('Create Order', handleCreateOrder);
    } else {
      telegram.hideMainButton();
    }
  }, [user, selectedOrder, showCreateForm]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        Loading orders...
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
        dispatchService={dispatchService}
      />
    );
  }

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          Orders
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '16px',
            marginBottom: '16px'
          }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {['all', 'new', 'assigned', 'enroute', 'delivered'].map((status) => (
            <button
              key={status}
              onClick={() => {
                telegram.hapticFeedback('selection');
                setFilter(status);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filter === status ? theme.button_color : theme.secondary_bg_color,
                color: filter === status ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ padding: '16px' }}>
        {orders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            No orders found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => {
                  telegram.hapticFeedback('selection');
                  setSelectedOrder(order);
                }}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, theme }: { 
  order: Order; 
  onClick: () => void;
  theme: any;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#ff3b30';
      case 'assigned': return '#ff9500';
      case 'enroute': return '#007aff';
      case 'delivered': return '#34c759';
      case 'failed': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            {order.customer_name}
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: theme.hint_color,
            lineHeight: '1.4'
          }}>
            {order.customer_address}
          </p>
        </div>
        
        <div style={{
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: getStatusColor(order.status) + '20',
          color: getStatusColor(order.status),
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {order.status.toUpperCase()}
        </div>
      </div>

      {order.eta && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: theme.hint_color
        }}>
          ETA: {new Date(order.eta).toLocaleString()}
        </p>
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
  dispatchService
}: {
  order: Order;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
  currentUser: User | null;
  dispatchService: DispatchService;
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
        telegram.showAlert('אין לך הרשאה להקצות הזמנה לנהג');
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
      telegram.hapticFeedback('notification', 'success');
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Failed to update order:', error);
      telegram.showAlert('Failed to update order status');
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
        console.error('Failed to load zones for assignment', err);
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
      const drivers = await dispatchService.getEligibleDrivers({ zoneId, items: orderItems });
      setCandidates(drivers);
      setAssignError(drivers.length === 0 ? 'אין נהגים זמינים עם מלאי מתאים באזור זה' : null);
    } catch (err) {
      console.error('Failed to load driver candidates', err);
      setAssignError('שגיאה בטעינת רשימת הנהגים');
    } finally {
      setAssignLoading(false);
    }
  }, [dispatchService, orderItems]);

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
      await dispatchService.assignOrder(order, selectedDriver, selectedZone || undefined);
      telegram.hapticFeedback('notification', 'success');
      Toast.success('ההזמנה הוקצתה לנהג בהצלחה');
      onUpdate();
      onBack();
    } catch (err) {
      console.error('Failed to assign order', err);
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

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <h1 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        Order Details
      </h1>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          {order.customer_name}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
          {order.customer_address}
        </p>

        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: theme.secondary_bg_color,
          display: 'inline-block',
          marginBottom: '16px'
        }}>
          Status: <strong>{order.status.toUpperCase()}</strong>
        </div>

        {order.eta && (
          <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
            ETA: {new Date(order.eta).toLocaleString()}
          </p>
        )}

        {order.notes && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Notes
            </h3>
            <p style={{ margin: 0, color: theme.hint_color }}>
              {order.notes}
            </p>
          </div>
        )}

        {orderItems.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Items
            </h3>
            {orderItems.map((item, index) => {
              const itemName = (item as any).product_name || (item as any).name || '';
              return (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: index < orderItems.length - 1 ? `1px solid ${theme.hint_color}20` : 'none'
                }}>
                  <span>{itemName}</span>
                  <span>×{item.quantity}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {order.status !== 'delivered' && order.status !== 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.status === 'new' && canAssign && !isAssigning && (
            <button
              onClick={() => handleStatusUpdate('assigned')}
              style={{
                padding: '12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              הקצה הזמנה
            </button>
          )}

          {isAssigning && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${theme.hint_color}30`,
                backgroundColor: theme.secondary_bg_color || '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <h3 style={{ margin: 0 }}>בחירת אזור ונהג</h3>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: theme.hint_color }}>בחר אזור</label>
                <select
                  value={selectedZone}
                  onChange={(event) => setSelectedZone(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.hint_color}40`,
                    backgroundColor: theme.bg_color,
                    color: theme.text_color
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
                <div style={{ color: '#ff3b30', backgroundColor: '#ff3b3020', padding: '8px 12px', borderRadius: '8px' }}>
                  {assignError}
                </div>
              )}

              {assignLoading ? (
                <div style={{ color: theme.hint_color }}>טוען נהגים זמינים…</div>
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
                        onClick={() => setSelectedDriver(candidate.driverId)}
                        style={{
                          textAlign: 'right',
                          border: `1px solid ${isSelected ? theme.button_color : theme.hint_color + '30'}`,
                          backgroundColor: isSelected ? theme.button_color + '20' : theme.bg_color,
                          color: theme.text_color,
                          borderRadius: '10px',
                          padding: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600 }}>נהג #{candidate.driverId}</div>
                          <div style={{ fontSize: '12px', color: theme.hint_color }}>דירוג: {Math.round(candidate.score)}</div>
                        </div>
                        <div style={{ color: theme.hint_color, fontSize: '14px' }}>
                          סטטוס: {candidate.status.status === 'available' ? 'זמין' : candidate.status.status === 'delivering' ? 'במשלוח' : candidate.status.status === 'on_break' ? 'בהפסקה' : 'סיום משמרת'}
                        </div>
                        <div style={{ color: theme.hint_color, fontSize: '12px', marginTop: '4px' }}>
                          מלאי כללי ברכב: {candidate.totalInventory} יחידות
                        </div>
                        {assignedZones && (
                          <div style={{ color: theme.hint_color, fontSize: '12px', marginTop: '2px' }}>
                            אזורים: {assignedZones}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {candidates.length === 0 && !assignError && (
                    <div style={{ color: theme.hint_color }}>אין נהגים זמינים באזור שנבחר.</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={confirmAssignment}
                  disabled={!selectedDriver || assignLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: theme.button_color,
                    color: theme.button_text_color || '#ffffff',
                    fontWeight: 600,
                    cursor: selectedDriver ? 'pointer' : 'not-allowed',
                    opacity: selectedDriver ? 1 : 0.6
                  }}
                >
                  אשר הקצאה
                </button>
                <button
                  onClick={cancelAssignment}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.hint_color}40`,
                    backgroundColor: 'transparent',
                    color: theme.text_color,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  בטל
                </button>
              </div>
            </div>
          )}

          {order.status === 'assigned' && (
            <button
              onClick={() => handleStatusUpdate('enroute')}
              style={{
                padding: '12px',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Mark En Route
            </button>
          )}

          {order.status === 'enroute' && (
            <button
              onClick={() => handleStatusUpdate('delivered')}
              style={{
                padding: '12px',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Mark Delivered
            </button>
          )}
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
  const [loading, setLoading] = useState(false);
  const [dmState, setDmState] = useState<{ items: DraftOrderItem[]; errors: string[]; rawText: string }>({
    items: [],
    errors: [],
    rawText: ''
  });
  const [storefrontItems, setStorefrontItems] = useState<DraftOrderItem[]>([]);

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
        console.error('Failed to load products for order creation', error);
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

  const handleMainButtonClick = useCallback(() => {
    const form = document.getElementById('create-order-form') as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);

  useEffect(() => {
    telegram.setMainButton({
      text: loading ? 'שולח הזמנה…' : 'Create Order',
      onClick: handleMainButtonClick
    });
  }, [handleMainButtonClick, loading]);

  useEffect(() => () => {
    telegram.hideMainButton();
  }, []);

  const activeItems = activeMode === 'dm' ? dmState.items : storefrontItems;
  const totalAmount = activeItems.reduce(
    (sum, item) => sum + item.quantity * (item.product.price || 0),
    0
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.customerName || !formData.customerAddress || !formData.customerPhone) {
      telegram.showAlert('אנא מלאו שם, טלפון וכתובת לקוח');
      return;
    }

    if (activeItems.length === 0) {
      telegram.showAlert('יש להוסיף לפחות פריט אחד להזמנה');
      return;
    }

    if (activeMode === 'dm' && dmState.errors.length > 0) {
      telegram.showAlert('לא ניתן לשמור הזמנה עם שורות שלא זוהו');
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

      telegram.hapticFeedback('notification', 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create order:', error);
      telegram.showAlert('אירעה שגיאה ביצירת ההזמנה');
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
          ) : activeMode === 'dm' ? (
            <DmOrderParser
              products={products}
              theme={theme}
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
                  key={`${item.product.id}-${item.product.sku}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: theme.bg_color
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: theme.text_color }}>{item.product.name}</span>
                    <span style={{ fontSize: '12px', color: theme.hint_color }}>₪{item.product.price.toLocaleString()} × {item.quantity}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: theme.text_color }}>
                    ₪{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
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
