import React, { useState, useEffect } from 'react';
import { DataStore, Product, CreateOrderInput } from '../data/types';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';
import { TelegramModal } from './TelegramModal';
import { offlineStore } from '../utils/offlineStore';

interface DualModeOrderEntryProps {
  dataStore: DataStore;
  onOrderCreated: (orderId: string) => void;
  onCancel: () => void;
}

const ROYAL_COLORS = {
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#9c6dff',
  gold: '#f6c945',
  teal: '#4dd0e1',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

interface CartItem {
  product: Product;
  quantity: number;
}

type OrderMode = 'text' | 'storefront';

export function DualModeOrderEntry({ dataStore, onOrderCreated, onCancel }: DualModeOrderEntryProps) {
  const [mode, setMode] = useState<OrderMode>('text');
  const [textInput, setTextInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      if (!dataStore.listProducts) {
        Toast.error('לא ניתן לטעון מוצרים');
        return;
      }
      const allProducts = await dataStore.listProducts();
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Toast.error('שגיאה בטעינת מוצרים');
    }
  };

  const parseTextOrder = (text: string): CartItem[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedItems: CartItem[] = [];

    for (const line of lines) {
      const match = line.match(/^[-•*]?\s*(.+?)\s*[x×]\s*(\d+)\s*$/i);
      if (match) {
        const [, productName, quantityStr] = match;
        const quantity = parseInt(quantityStr, 10);

        if (quantity > 0) {
          const product = products.find(p =>
            p.name.includes(productName.trim()) ||
            productName.trim().includes(p.name) ||
            p.name.toLowerCase().includes(productName.trim().toLowerCase())
          );

          if (product) {
            parsedItems.push({ product, quantity });
          }
        }
      }
    }

    return parsedItems;
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      Toast.error('אנא הזן פרטי הזמנה');
      return;
    }

    const parsedItems = parseTextOrder(textInput);

    if (parsedItems.length === 0) {
      Toast.error('לא נמצאו מוצרים תקינים בטקסט');
      return;
    }

    setCart(parsedItems);
    Toast.success(`זוהו ${parsedItems.length} מוצרים`);
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    telegram.hapticFeedback('selection');
    Toast.success(`${product.name} נוסף לעגלה`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
    telegram.hapticFeedback('selection');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      Toast.error('העגלה ריקה');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      Toast.error('אנא מלא את כל פרטי הלקוח');
      return;
    }

    if (!dataStore.createOrder) {
      Toast.error('לא ניתן ליצור הזמנה');
      return;
    }

    const orderInput: CreateOrderInput = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      items: cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total_amount: calculateTotal(),
      notes: notes || undefined,
      status: 'new',
      entry_mode: mode === 'text' ? 'dm_text' : 'storefront',
      raw_order_text: mode === 'text' ? textInput : undefined
    };

    setLoading(true);
    try {
      const result = await dataStore.createOrder(orderInput);
      telegram.hapticFeedback('notification', 'success');
      Toast.success('הזמנה נוצרה בהצלחה!');
      onOrderCreated(result.id);
    } catch (error) {
      console.error('Failed to create order:', error);
      if (offlineStore.isOfflineError(error)) {
        try {
          const queued = await offlineStore.queueMutation('createOrder', { input: orderInput }, {
            meta: {
              summary: `הזמנה עבור ${customerName || 'לקוח ללא שם'}`,
              entityType: 'order'
            }
          });
          telegram.hapticFeedback('notification', 'success');
          Toast.info('הזמנה נשמרה ותישלח כשנחזור לרשת.');
          onOrderCreated(queued.id);
        } catch (queueError) {
          console.error('Failed to queue offline order:', queueError);
          Toast.error('שגיאה ביצירת הזמנה');
        }
      } else {
        Toast.error('שגיאה ביצירת הזמנה');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <TelegramModal
      isOpen={true}
      onClose={onCancel}
      title="הזמנה חדשה"
      primaryButton={
        cart.length > 0
          ? {
              text: `צור הזמנה (₪${calculateTotal().toFixed(2)})`,
              onClick: handleSubmitOrder,
              disabled: loading
            }
          : undefined
      }
      secondaryButton={{
        text: 'ביטול',
        onClick: onCancel
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl' }}>
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setMode('text');
              telegram.hapticFeedback('selection');
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'text' ? `linear-gradient(120deg, ${ROYAL_COLORS.accent}, ${ROYAL_COLORS.teal})` : ROYAL_COLORS.card,
              border: `1px solid ${mode === 'text' ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📝 הזמנה מהירה
          </button>
          <button
            onClick={() => {
              setMode('storefront');
              telegram.hapticFeedback('selection');
            }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'storefront' ? `linear-gradient(120deg, ${ROYAL_COLORS.accent}, ${ROYAL_COLORS.gold})` : ROYAL_COLORS.card,
              border: `1px solid ${mode === 'storefront' ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🛒 חנות ויזואלית
          </button>
        </div>

        {/* Text Mode */}
        {mode === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                הזן מוצרים בפורמט: שם המוצר x כמות
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="דוגמה:&#10;בלו קוש x2&#10;פיינאפל אקספרס x1&#10;גלקטיק OG x3"
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(20, 8, 46, 0.6)',
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button
              onClick={handleTextSubmit}
              style={{
                padding: '12px',
                background: `linear-gradient(120deg, ${ROYAL_COLORS.teal}, ${ROYAL_COLORS.accent})`,
                border: 'none',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              זהה מוצרים
            </button>
          </div>
        )}

        {/* Storefront Mode */}
        {mode === 'storefront' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש מוצרים..."
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px'
              }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(20, 8, 46, 0.6)',
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{product.name}</div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      ₪{product.price.toFixed(2)} • במלאי: {product.stock_quantity}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock_quantity === 0}
                    style={{
                      padding: '8px 16px',
                      background: product.stock_quantity === 0 ? 'rgba(255, 107, 138, 0.2)' : `${ROYAL_COLORS.teal}`,
                      border: 'none',
                      borderRadius: '10px',
                      color: ROYAL_COLORS.text,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {product.stock_quantity === 0 ? 'אזל' : '+ הוסף'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div
            style={{
              padding: '16px',
              background: ROYAL_COLORS.card,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '16px'
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700' }}>🛒 עגלת קניות</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    background: 'rgba(20, 8, 46, 0.4)',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.product.name}</div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      ₪{item.product.price.toFixed(2)} x {item.quantity} = ₪{(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '8px',
                        background: 'rgba(255, 107, 138, 0.2)',
                        color: '#ff6b8a',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '8px',
                        background: `${ROYAL_COLORS.teal}40`,
                        color: ROYAL_COLORS.teal,
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '8px',
                        background: 'rgba(255, 107, 138, 0.2)',
                        color: '#ff6b8a',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: '700'
              }}
            >
              <span>סה"כ:</span>
              <span style={{ color: ROYAL_COLORS.gold }}>₪{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Customer Details */}
        {cart.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>📋 פרטי לקוח</h3>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="שם הלקוח *"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px'
              }}
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="טלפון *"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="כתובת למשלוח *"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px'
              }}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות (אופציונלי)"
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}
      </div>
    </TelegramModal>
  );
}
