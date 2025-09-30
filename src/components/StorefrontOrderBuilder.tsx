import React, { useMemo, useState } from 'react';
import { Product } from '../../data/types';
import { DraftOrderItem } from './DmOrderParser';

interface StorefrontOrderBuilderProps {
  products: Product[];
  value: DraftOrderItem[];
  theme: any;
  onChange: (items: DraftOrderItem[]) => void;
}

export function StorefrontOrderBuilder({ products, value, theme, onChange }: StorefrontOrderBuilderProps) {
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  }, [products, search]);

  const handleAddProduct = (product: Product) => {
    const existing = value.find(item => item.product.id === product.id);
    if (existing) {
      onChange(
        value.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      onChange([...value, { product, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      onChange(value.filter(item => item.product.id !== productId));
      return;
    }

    onChange(
      value.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontWeight: 600, color: theme.text_color }}>חיפוש מוצר</label>
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="חיפוש לפי שם או SKU"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${theme.hint_color}40`,
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '15px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {filteredProducts.map(product => (
          <button
            key={product.id}
            onClick={() => handleAddProduct(product)}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${theme.hint_color}30`,
              backgroundColor: theme.secondary_bg_color || '#f8f8f8',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 600, color: theme.text_color, marginBottom: '8px' }}>{product.name}</div>
            <div style={{ fontSize: '12px', color: theme.hint_color }}>SKU: {product.sku}</div>
            <div style={{ fontSize: '13px', color: theme.text_color, marginTop: '8px' }}>₪{product.price.toLocaleString()}</div>
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div
          style={{
            borderRadius: '10px',
            border: `1px solid ${theme.hint_color}30`,
            backgroundColor: theme.secondary_bg_color || '#f8f8f8'
          }}
        >
          <div
            style={{
              padding: '12px',
              borderBottom: `1px solid ${theme.hint_color}20`,
              fontWeight: 600,
              color: theme.text_color
            }}
          >
            סל הזמנה
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {value.map(item => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: `1px solid ${theme.hint_color}15`
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, color: theme.text_color }}>{item.product.name}</span>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>₪{item.product.price.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={event => handleQuantityChange(item.product.id, Number(event.target.value) || 0)}
                  style={{
                    width: '64px',
                    textAlign: 'center',
                    padding: '6px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.hint_color}40`,
                    backgroundColor: theme.bg_color,
                    color: theme.text_color
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
