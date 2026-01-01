import React, { useState, useEffect } from 'react';
import { DataStore, Product, CreateOrderInput } from '../data/types';
import { Toast } from './Toast';

import { offlineStore } from '../utils/offlineStore';
import { logger } from '../lib/logger';

interface DualModeOrderEntryProps {
  dataStore: DataStore;
  onOrderCreated: (orderId: string) => void;
  onCancel: () => void;
}



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
      logger.error('Failed to load products:', error);
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

      Toast.success('הזמנה נוצרה בהצלחה!');
      onOrderCreated(result.id);
    } catch (error) {
      logger.error('Failed to create order:', error);
      if (offlineStore.isOfflineError(error)) {
        try {
          const queued = await offlineStore.queueMutation('createOrder', { input: orderInput }, {
            meta: {
              summary: `הזמנה עבור ${customerName || 'לקוח ללא שם'}`,
              entityType: 'order'
            }
          });

          Toast.info('הזמנה נשמרה ותישלח כשנחזור לרשת.');
          onOrderCreated(queued.id);
        } catch (queueError) {
          logger.error('Failed to queue offline order:', queueError);
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: tokens.colors.background.card,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: tokens.shadows.md,
        border: `1px solid ${tokens.colors.background.cardBorder}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: tokens.colors.text.primary, margin: 0 }}>📝 Create Order</h2>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.secondary,
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setMode('text')}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'text' ? tokens.colors.brand.primary : 'transparent',
              border: `2px solid ${mode === 'text' ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: mode === 'text' ? '#fff' : tokens.colors.text.primary,
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📝 Text Mode
          </button>
          <button
            onClick={() => setMode('storefront')}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'storefront' ? tokens.colors.brand.primary : 'transparent',
              border: `2px solid ${mode === 'storefront' ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: mode === 'storefront' ? '#fff' : tokens.colors.text.primary,
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🛒 Storefront Mode
          </button>
        </div>

        {/* Text Input Mode */}
        {mode === 'text' && (
          <div style={{ marginBottom: '24px' }}>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste order text here (e.g., 'Product Name x 2')"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                borderRadius: '8px',
                color: tokens.colors.text.primary,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <button
              onClick={handleTextSubmit}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                background: tokens.colors.brand.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Parse Text
            </button>
          </div>
        )}

        {/* Storefront Mode */}
        {mode === 'storefront' && (
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                borderRadius: '8px',
                color: tokens.colors.text.primary,
                fontSize: '14px',
                marginBottom: '12px'
              }}
            />
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  style={{
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ color: tokens.colors.text.primary, fontWeight: '600' }}>{product.name}</div>
                    <div style={{ color: tokens.colors.status.warning, fontSize: '14px' }}>${product.price}</div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    style={{
                      padding: '8px 16px',
                      background: tokens.colors.brand.primary,
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: tokens.colors.text.primary, marginBottom: '12px' }}>Cart</h3>
            {cart.map(item => (
              <div
                key={item.product.id}
                style={{
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: tokens.colors.text.primary }}>{item.product.name}</div>
                  <div style={{ color: tokens.colors.status.warning, fontSize: '14px' }}>
                    ${item.product.price} × {item.quantity} = ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                    style={{
                      padding: '4px 12px',
                      background: tokens.colors.background.cardBorder,
                      border: 'none',
                      borderRadius: '4px',
                      color: tokens.colors.text.primary,
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <span style={{ color: tokens.colors.text.primary, minWidth: '30px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                    style={{
                      padding: '4px 12px',
                      background: tokens.colors.background.cardBorder,
                      border: 'none',
                      borderRadius: '4px',
                      color: tokens.colors.text.primary,
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    style={{
                      padding: '4px 12px',
                      background: 'rgba(255, 59, 48, 0.2)',
                      border: '1px solid #ff3b30',
                      borderRadius: '4px',
                      color: '#ff3b30',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(246, 201, 69, 0.1)',
              borderRadius: '8px',
              textAlign: 'right'
            }}>
              <div style={{ color: tokens.colors.status.warning, fontSize: '18px', fontWeight: '700' }}>
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: tokens.colors.text.primary, marginBottom: '12px' }}>Customer Information</h3>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '8px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              marginBottom: '12px'
            }}
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone Number"
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '8px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              marginBottom: '12px'
            }}
          />
          <textarea
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Delivery Address"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '8px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              marginBottom: '12px',
              resize: 'vertical'
            }}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Order Notes (optional)"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '8px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '14px',
              background: 'transparent',
              border: `2px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: tokens.colors.text.secondary,
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={loading || cart.length === 0}
            style={{
              flex: 1,
              padding: '14px',
              background: loading || cart.length === 0 ? tokens.colors.background.cardBorder : tokens.colors.brand.primary,
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: '600',
              cursor: loading || cart.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || cart.length === 0 ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Creating...' : '✅ Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
