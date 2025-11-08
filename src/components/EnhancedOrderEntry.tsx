import React, { useState, useEffect, useMemo } from 'react';
import { Product, DataStore, User, CreateOrderInput } from '../data/types';
import { DraftOrderItem, ProductInventoryAvailability } from './orderTypes';
import { DmOrderParser } from './DmOrderParser';
import { StorefrontOrderBuilder } from './StorefrontOrderBuilder';
import { ORDER_FORM_STYLES } from '../styles/orderTheme';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';
import { logger } from '../lib/logger';

interface EnhancedOrderEntryProps {
  dataStore: DataStore;
  currentUser: User | null;
  onCancel: () => void;
  onSuccess: (orderId: string) => void;
}

type EntryMode = 'dm' | 'storefront' | 'quick';

interface QuickOrderTemplate {
  id: string;
  name: string;
  items: DraftOrderItem[];
  icon: string;
}

export function EnhancedOrderEntry({
  dataStore,
  currentUser,
  onCancel,
  onSuccess
}: EnhancedOrderEntryProps) {
  const [mode, setMode] = useState<EntryMode>('storefront');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliveryDate: ''
  });

  const [dmState, setDmState] = useState<{
    items: DraftOrderItem[];
    errors: string[];
    rawText: string;
  }>({
    items: [],
    errors: [],
    rawText: ''
  });

  const [storefrontItems, setStorefrontItems] = useState<DraftOrderItem[]>([]);
  const [inventoryAvailability, setInventoryAvailability] = useState<
    Record<string, ProductInventoryAvailability>
  >({});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recentCustomers, setRecentCustomers] = useState<Array<{
    name: string;
    phone: string;
    address: string;
  }>>([]);

  const [quickTemplates] = useState<QuickOrderTemplate[]>([
    {
      id: 'standard',
      name: 'הזמנה סטנדרטית',
      items: [],
      icon: '📦'
    },
    {
      id: 'bulk',
      name: 'הזמנה בכמות',
      items: [],
      icon: '📊'
    },
    {
      id: 'urgent',
      name: 'הזמנה דחופה',
      items: [],
      icon: '🔥'
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsList] = await Promise.all([
        dataStore.listProducts?.() || []
      ]);

      setProducts(productsList);
      await loadInventoryData(productsList);
    } catch (error) {
      logger.error('Failed to load data:', error);
      Toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryData = async (productsList: Product[]) => {
    if (!dataStore.listInventory || !dataStore.listInventoryLocations) {
      return;
    }

    try {
      const [records, locations] = await Promise.all([
        dataStore.listInventory(),
        dataStore.listInventoryLocations()
      ]);

      const availabilityMap: Record<string, ProductInventoryAvailability> = {};
      const locationNames = new Map(locations.map(loc => [loc.id, loc.name]));

      records.forEach(record => {
        const available = Math.max(
          0,
          (record.on_hand_quantity ?? 0) - (record.reserved_quantity ?? 0)
        );

        if (!availabilityMap[record.product_id]) {
          availabilityMap[record.product_id] = {
            totalAvailable: 0,
            byLocation: []
          };
        }

        availabilityMap[record.product_id].totalAvailable += available;
        availabilityMap[record.product_id].byLocation.push({
          locationId: record.location_id,
          locationName: record.location?.name || locationNames.get(record.location_id) || record.location_id,
          available
        });
      });

      Object.values(availabilityMap).forEach(entry => {
        entry.byLocation.sort((a, b) => b.available - a.available);
      });

      setInventoryAvailability(availabilityMap);
    } catch (error) {
      logger.error('Failed to load inventory:', error);
    }
  };

  const activeItems = mode === 'dm' ? dmState.items : storefrontItems;

  const totalAmount = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + item.quantity * (item.product.price || 0), 0);
  }, [activeItems]);

  const inventoryIssues = useMemo(() => {
    const issues: string[] = [];

    activeItems.forEach(item => {
      const availability = inventoryAvailability[item.product.id];

      if (!availability || availability.totalAvailable <= 0) {
        issues.push(`אין מלאי זמין עבור ${item.product.name}`);
        return;
      }

      if (!item.source_location) {
        issues.push(`בחר מקור מלאי עבור ${item.product.name}`);
        return;
      }

      const selectedLocation = availability.byLocation.find(
        loc => loc.locationId === item.source_location
      );

      if (!selectedLocation) {
        issues.push(`המיקום שנבחר עבור ${item.product.name} אינו קיים במלאי`);
        return;
      }

      if (selectedLocation.available < item.quantity) {
        issues.push(
          `${item.product.name}: זמינות ${selectedLocation.available} יחידות בלבד במיקום שנבחר`
        );
      }
    });

    return issues;
  }, [activeItems, inventoryAvailability]);

  const validateOrder = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = 'שם הלקוח הוא שדה חובה';
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'מספר טלפון הוא שדה חובה';
    }

    if (!customerInfo.address.trim()) {
      newErrors.address = 'כתובת משלוח היא שדה חובה';
    }

    if (activeItems.length === 0) {
      Toast.error('יש להוסיף לפחות פריט אחד להזמנה');
      return false;
    }

    if (mode === 'dm' && dmState.errors.length > 0) {
      Toast.error('לא ניתן לשמור הזמנה עם שגיאות פענוח');
      return false;
    }

    if (inventoryIssues.length > 0) {
      Toast.error('יש לפתור בעיות מלאי לפני שליחת ההזמנה');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateOrder()) {
      return;
    }

    setSubmitting(true);

    try {
      const orderInput: CreateOrderInput = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        notes: customerInfo.notes || undefined,
        delivery_date: customerInfo.deliveryDate || undefined,
        entry_mode: mode === 'dm' ? 'dm' : 'storefront',
        salesperson_id: currentUser?.telegram_id,
        raw_order_text: mode === 'dm' ? dmState.rawText : undefined,
        items: activeItems.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          source_location: item.source_location
        })),
        total_amount: totalAmount,
        status: 'new'
      };

      const result = await dataStore.createOrder?.(orderInput);

      if (result?.id) {
        telegram.hapticFeedback('notification', 'success');
        Toast.success('ההזמנה נוצרה בהצלחה!');
        onSuccess(result.id);
      }
    } catch (error) {
      logger.error('Failed to create order:', error);
      telegram.hapticFeedback('notification', 'error');
      Toast.error('שגיאה ביצירת ההזמנה');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCustomerFromRecent = (customer: typeof recentCustomers[0]) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      notes: customerInfo.notes,
      deliveryDate: customerInfo.deliveryDate
    });
    telegram.hapticFeedback('selection');
    Toast.success('פרטי לקוח הועתקו');
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontSize: '16px', color: '#666' }}>טוען...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
        padding: '20px',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
              📝 יצירת הזמנה חדשה
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              {mode === 'dm' && 'הדבק הודעה מטלגרם'}
              {mode === 'storefront' && 'בחר מוצרים מהקטלוג'}
              {mode === 'quick' && 'הזמנה מהירה מתבנית'}
            </p>
          </div>

          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              color: '#FFFFFF',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            ביטול
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Mode Selector */}
        <div style={{
          ...ORDER_FORM_STYLES.section,
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: '#212121'
          }}>
            🎯 בחר שיטת הזמנה
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <button
              onClick={() => {
                setMode('storefront');
                telegram.hapticFeedback('selection');
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: `3px solid ${mode === 'storefront' ? '#1D9BF0' : '#E0E0E0'}`,
                background: mode === 'storefront' ? 'rgba(29, 155, 240, 0.1)' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛍️</div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: mode === 'storefront' ? '#1D9BF0' : '#212121',
                marginBottom: '4px'
              }}>
                בחירת מוצרים
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                דפדף בקטלוג והוסף לסל
              </div>
            </button>

            <button
              onClick={() => {
                setMode('dm');
                telegram.hapticFeedback('selection');
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: `3px solid ${mode === 'dm' ? '#1D9BF0' : '#E0E0E0'}`,
                background: mode === 'dm' ? 'rgba(29, 155, 240, 0.1)' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: mode === 'dm' ? '#1D9BF0' : '#212121',
                marginBottom: '4px'
              }}>
                הדבק מטלגרם
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                העתק הזמנה מהודעת לקוח
              </div>
            </button>

            <button
              onClick={() => {
                setMode('quick');
                telegram.hapticFeedback('selection');
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: `3px solid ${mode === 'quick' ? '#1D9BF0' : '#E0E0E0'}`,
                background: mode === 'quick' ? 'rgba(29, 155, 240, 0.1)' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: mode === 'quick' ? '#1D9BF0' : '#212121',
                marginBottom: '4px'
              }}>
                הזמנה מהירה
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                תבניות מוכנות מראש
              </div>
            </button>
          </div>
        </div>

        {/* Customer Info */}
        <div style={ORDER_FORM_STYLES.section}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: '#212121'
          }}>
            👤 פרטי לקוח
          </h2>

          {recentCustomers.length > 0 && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#F9FAFB',
              borderRadius: '12px'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                לקוחות אחרונים
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {recentCustomers.slice(0, 3).map((customer, idx) => (
                  <button
                    key={idx}
                    onClick={() => fillCustomerFromRecent(customer)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E0E0E0',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={ORDER_FORM_STYLES.label}>שם לקוח *</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                style={{
                  ...ORDER_FORM_STYLES.input,
                  ...(errors.name ? ORDER_FORM_STYLES.error : {})
                }}
                placeholder="שם פרטי ומשפחה"
              />
              {errors.name && (
                <div style={ORDER_FORM_STYLES.errorText}>⚠️ {errors.name}</div>
              )}
            </div>

            <div>
              <label style={ORDER_FORM_STYLES.label}>טלפון *</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                style={{
                  ...ORDER_FORM_STYLES.input,
                  ...(errors.phone ? ORDER_FORM_STYLES.error : {})
                }}
                placeholder="050-1234567"
              />
              {errors.phone && (
                <div style={ORDER_FORM_STYLES.errorText}>⚠️ {errors.phone}</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={ORDER_FORM_STYLES.label}>כתובת מסירה *</label>
            <textarea
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              style={{
                ...ORDER_FORM_STYLES.input,
                minHeight: '80px',
                resize: 'vertical' as const,
                ...(errors.address ? ORDER_FORM_STYLES.error : {})
              }}
              placeholder="רחוב, מספר בית, עיר"
            />
            {errors.address && (
              <div style={ORDER_FORM_STYLES.errorText}>⚠️ {errors.address}</div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}>
            <div>
              <label style={ORDER_FORM_STYLES.label}>תאריך אספקה מבוקש</label>
              <input
                type="datetime-local"
                value={customerInfo.deliveryDate}
                onChange={(e) => setCustomerInfo({ ...customerInfo, deliveryDate: e.target.value })}
                style={ORDER_FORM_STYLES.input}
              />
            </div>

            <div>
              <label style={ORDER_FORM_STYLES.label}>הערות להזמנה</label>
              <input
                type="text"
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                style={ORDER_FORM_STYLES.input}
                placeholder="הערות מיוחדות"
              />
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div style={ORDER_FORM_STYLES.section}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: '#212121'
          }}>
            📦 פריטים בהזמנה
          </h2>

          {mode === 'dm' && (
            <DmOrderParser
              products={products}
              theme={telegram.themeParams}
              inventoryAvailability={inventoryAvailability}
              onChange={(items, context) => setDmState({
                items,
                errors: context.errors,
                rawText: context.rawText
              })}
            />
          )}

          {mode === 'storefront' && (
            <StorefrontOrderBuilder
              products={products}
              value={storefrontItems}
              theme={telegram.themeParams}
              inventoryAvailability={inventoryAvailability}
              onChange={setStorefrontItems}
            />
          )}

          {mode === 'quick' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {quickTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    setStorefrontItems(template.items);
                    setMode('storefront');
                    telegram.hapticFeedback('selection');
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    border: '2px solid #E0E0E0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                    {template.icon}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#212121'
                  }}>
                    {template.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Inventory Issues */}
          {inventoryIssues.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: '#FFF3E0',
              border: '2px solid #FF9800',
              borderRadius: '12px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#E65100',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ בעיות מלאי שיש לטפל בהן
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inventoryIssues.map((issue, idx) => (
                  <div key={idx} style={{ fontSize: '14px', color: '#E65100' }}>
                    • {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {activeItems.length > 0 && (
          <div style={{
            ...ORDER_FORM_STYLES.section,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e9f0 100%)',
            border: '2px solid #1D9BF0'
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: '#212121'
            }}>
              💰 סיכום הזמנה
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeItems.map(item => (
                <div
                  key={item.draftId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#FFFFFF',
                    borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      ₪{item.product.price.toLocaleString()} × {item.quantity}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1D9BF0'
                  }}>
                    ₪{(item.product.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '16px',
                marginTop: '8px',
                borderTop: '3px solid #1D9BF0',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                <span>סה״כ:</span>
                <span style={{ color: '#1D9BF0' }}>
                  ₪{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E0E0E0',
        padding: '16px 20px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '14px 24px',
              borderRadius: '12px',
              border: '2px solid #E0E0E0',
              background: '#FFFFFF',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || activeItems.length === 0}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '12px',
              border: 'none',
              background: submitting || activeItems.length === 0
                ? '#CCCCCC'
                : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
              color: '#FFFFFF',
              fontWeight: '700',
              cursor: submitting || activeItems.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              boxShadow: submitting || activeItems.length === 0
                ? 'none'
                : '0 4px 12px rgba(76, 175, 80, 0.3)'
            }}
          >
            {submitting ? '⏳ שולח...' : `✅ שלח הזמנה (₪${totalAmount.toLocaleString()})`}
          </button>
        </div>
      </div>
    </div>
  );
}
