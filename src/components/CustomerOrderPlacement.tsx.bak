import React, { useState, useEffect, useMemo } from 'react';
import { Product, DataStore, CreateOrderInput } from '../data/types';
import { DraftOrderItem, ProductInventoryAvailability } from './orderTypes';
import { ORDER_FORM_STYLES, ORDER_CARD_STYLES } from '../styles/orderTheme';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';

interface CustomerOrderPlacementProps {
  dataStore: DataStore;
  onSuccess?: (orderId: string) => void;
  onCancel?: () => void;
}

interface CartItem extends DraftOrderItem {
  subtotal: number;
}

export function CustomerOrderPlacement({ dataStore, onSuccess, onCancel }: CustomerOrderPlacementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [step, setStep] = useState<'browse' | 'cart' | 'checkout'>('browse');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliveryDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsList = await dataStore.listProducts?.() || [];
      setProducts(productsList);
    } catch (error) {
      console.error('Failed to load products:', error);
      Toast.error('שגיאה בטעינת המוצרים');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    telegram.hapticFeedback('selection');

    const existing = cart.find(item => item.product.id === product.id);

    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * product.price
            }
          : item
      ));
    } else {
      setCart([
        ...cart,
        {
          draftId: product.id,
          product,
          quantity: 1,
          source_location: null,
          subtotal: product.price
        }
      ]);
    }

    Toast.success(`${product.name} נוסף לסל`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity,
            subtotal: quantity * item.product.price
          }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    telegram.hapticFeedback('impact', 'light');
    setCart(cart.filter(item => item.product.id !== productId));
    Toast.info('פריט הוסר מהסל');
  };

  const validateCheckout = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = 'שם מלא הוא שדה חובה';
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'מספר טלפון הוא שדה חובה';
    } else if (!/^0\d{1,2}-?\d{7}$/.test(customerInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    if (!customerInfo.address.trim()) {
      newErrors.address = 'כתובת משלוח היא שדה חובה';
    }

    if (cart.length === 0) {
      Toast.error('הסל ריק - אנא הוסף מוצרים להזמנה');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitOrder = async () => {
    if (!validateCheckout()) {
      return;
    }

    setSubmitting(true);

    try {
      const profile = await dataStore.getProfile();

      const orderInput: CreateOrderInput = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        notes: customerInfo.notes,
        delivery_date: customerInfo.deliveryDate || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          source_location: item.source_location
        })),
        entry_mode: 'storefront',
        salesperson_id: profile.telegram_id,
        status: 'new',
        total_amount: cartTotal
      };

      const result = await dataStore.createOrder?.(orderInput);

      if (result?.id) {
        telegram.hapticFeedback('notification', 'success');
        Toast.success('ההזמנה נוצרה בהצלחה!');

        if (onSuccess) {
          onSuccess(result.id);
        }
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      telegram.hapticFeedback('notification', 'error');
      Toast.error('שגיאה ביצירת ההזמנה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
        <div style={{ color: '#666' }}>טוען מוצרים...</div>
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
        boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
              {step === 'browse' && '🛍️ הזמנת מוצרים'}
              {step === 'cart' && '🛒 סל הקניות'}
              {step === 'checkout' && '✅ השלמת הזמנה'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              {step === 'browse' && 'בחר מוצרים והוסף לסל'}
              {step === 'cart' && `${cartItemCount} פריטים בסל`}
              {step === 'checkout' && 'מלא פרטי משלוח'}
            </p>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                color: '#FFFFFF',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ביטול
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Browse Products */}
        {step === 'browse' && (
          <>
            {/* Search and Filters */}
            <div style={ORDER_FORM_STYLES.section}>
              <input
                type="search"
                placeholder="🔍 חיפוש מוצרים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...ORDER_FORM_STYLES.input,
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: `2px solid ${selectedCategory === cat ? '#1D9BF0' : '#E0E0E0'}`,
                      background: selectedCategory === cat ? 'rgba(29, 155, 240, 0.1)' : '#FFFFFF',
                      color: selectedCategory === cat ? '#1D9BF0' : '#666',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cat === 'all' ? 'הכל' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    style={{
                      ...ORDER_CARD_STYLES.base,
                      background: '#FFFFFF',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {inCart && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: '#4CAF50',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        zIndex: 1
                      }}>
                        ✓ בסל ({inCart.quantity})
                      </div>
                    )}

                    {product.image_url && (
                      <div style={{
                        width: '100%',
                        height: '180px',
                        background: `url(${product.image_url}) center/cover`,
                        borderRadius: '12px',
                        marginBottom: '12px'
                      }} />
                    )}

                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#212121'
                    }}>
                      {product.name}
                    </h3>

                    {product.description && (
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.5'
                      }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#1D9BF0'
                      }}>
                        ₪{product.price.toLocaleString()}
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        הוסף לסל
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div style={{
                ...ORDER_FORM_STYLES.section,
                textAlign: 'center',
                padding: '60px 20px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                <div style={{ fontSize: '18px', color: '#666' }}>
                  לא נמצאו מוצרים
                </div>
              </div>
            )}
          </>
        )}

        {/* Cart View */}
        {step === 'cart' && (
          <div>
            {cart.length === 0 ? (
              <div style={{
                ...ORDER_FORM_STYLES.section,
                textAlign: 'center',
                padding: '60px 20px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
                <div style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                  הסל ריק
                </div>
                <button
                  onClick={() => setStep('browse')}
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
                  התחל לקנות
                </button>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    style={{
                      ...ORDER_FORM_STYLES.section,
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        {item.product.name}
                      </h3>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        ₪{item.product.price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '2px solid #E0E0E0',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        −
                      </button>

                      <div style={{
                        minWidth: '40px',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        {item.quantity}
                      </div>

                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '2px solid #1D9BF0',
                          background: '#FFFFFF',
                          color: '#1D9BF0',
                          cursor: 'pointer',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1D9BF0',
                      minWidth: '100px',
                      textAlign: 'left'
                    }}>
                      ₪{item.subtotal.toLocaleString()}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#FFEBEE',
                        color: '#F44336',
                        cursor: 'pointer',
                        fontSize: '20px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                <div style={{
                  ...ORDER_FORM_STYLES.section,
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e9f0 100%)',
                  border: '2px solid #1D9BF0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '24px',
                    fontWeight: '700'
                  }}>
                    <span>סה״כ לתשלום:</span>
                    <span style={{ color: '#1D9BF0' }}>
                      ₪{cartTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Checkout */}
        {step === 'checkout' && (
          <div>
            <div style={ORDER_FORM_STYLES.section}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>
                פרטי משלוח
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label style={ORDER_FORM_STYLES.label}>שם מלא *</label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  style={{
                    ...ORDER_FORM_STYLES.input,
                    ...(errors.name ? ORDER_FORM_STYLES.error : {})
                  }}
                  placeholder="שם פרטי ושם משפחה"
                />
                {errors.name && (
                  <div style={ORDER_FORM_STYLES.errorText}>⚠️ {errors.name}</div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
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

              <div style={{ marginBottom: '16px' }}>
                <label style={ORDER_FORM_STYLES.label}>כתובת מלאה *</label>
                <textarea
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  style={{
                    ...ORDER_FORM_STYLES.input,
                    minHeight: '80px',
                    resize: 'vertical' as const,
                    ...(errors.address ? ORDER_FORM_STYLES.error : {})
                  }}
                  placeholder="רחוב, מספר בית, עיר, מיקוד"
                />
                {errors.address && (
                  <div style={ORDER_FORM_STYLES.errorText}>⚠️ {errors.address}</div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={ORDER_FORM_STYLES.label}>הערות למשלוח</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  style={{
                    ...ORDER_FORM_STYLES.input,
                    minHeight: '60px',
                    resize: 'vertical' as const
                  }}
                  placeholder="הוראות מיוחדות, קוד כניסה, וכו׳"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={ORDER_FORM_STYLES.label}>מועד אספקה מבוקש</label>
                <input
                  type="datetime-local"
                  value={customerInfo.deliveryDate}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, deliveryDate: e.target.value })}
                  style={ORDER_FORM_STYLES.input}
                />
              </div>
            </div>

            <div style={{
              ...ORDER_FORM_STYLES.section,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e9f0 100%)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
                סיכום הזמנה
              </h3>

              {cart.map(item => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #E0E0E0'
                  }}
                >
                  <span>{item.product.name} × {item.quantity}</span>
                  <span style={{ fontWeight: '600' }}>
                    ₪{item.subtotal.toLocaleString()}
                  </span>
                </div>
              ))}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '2px solid #1D9BF0',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                <span>סה״כ:</span>
                <span style={{ color: '#1D9BF0' }}>
                  ₪{cartTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
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
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {step !== 'browse' && (
            <button
              onClick={() => {
                if (step === 'cart') setStep('browse');
                if (step === 'checkout') setStep('cart');
              }}
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
              ← חזור
            </button>
          )}

          {step === 'browse' && cart.length > 0 && (
            <button
              onClick={() => setStep('cart')}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <span>צפה בסל</span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 12px',
                borderRadius: '12px'
              }}>
                {cartItemCount}
              </span>
            </button>
          )}

          {step === 'cart' && cart.length > 0 && (
            <button
              onClick={() => setStep('checkout')}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
              }}
            >
              המשך לתשלום →
            </button>
          )}

          {step === 'checkout' && (
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: submitting
                  ? '#CCCCCC'
                  : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                boxShadow: submitting ? 'none' : '0 4px 12px rgba(76, 175, 80, 0.3)'
              }}
            >
              {submitting ? '⏳ שולח הזמנה...' : '✅ אשר הזמנה'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
