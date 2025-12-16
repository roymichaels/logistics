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

const ROYAL_COLORS = {
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#1D9BF0',
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: ROYAL_COLORS.text }}>Order Entry</h2>
        <p style={{ color: ROYAL_COLORS.muted }}>Component needs to be rebuilt after telegram removal</p>
      </div>
    </div>
  );
}
