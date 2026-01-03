import React, { useState } from 'react';
import { tokens } from '../../../styles/tokens';
import { Card } from '../../../components/molecules/Card';
import type { Product } from '../../../data/types';

interface EditableInventoryItem {
  product_id: string;
  quantity: number;
  draftQuantity: number;
  product?: Product;
  location_id?: string | null;
  isNew?: boolean;
}

interface DriverInventoryViewProps {
  items: EditableInventoryItem[];
  products: Product[];
  loading: boolean;
  syncing: boolean;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onAdd: (productId: string) => void;
  onSync: () => void;
}

export function DriverInventoryView({
  items,
  products,
  loading,
  syncing,
  onQuantityChange,
  onRemove,
  onAdd,
  onSync,
}: DriverInventoryViewProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const hintColor = '#999999';

  const availableProducts = products.filter(
    product => !items.some(item => item.product_id === product.id)
  );

  const totalUnits = items.reduce((sum, item) => sum + (item.draftQuantity || 0), 0);

  const handleAddClick = () => {
    if (selectedProductId) {
      onAdd(selectedProductId);
      setSelectedProductId('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: tokens.colors.panel,
      color: tokens.colors.text,
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>המלאי שלי</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        נהל את המלאי ברכב שלך
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ color: hintColor }}>סה"כ יחידות: {totalUnits}</div>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: tokens.colors.brand.primary,
            color: tokens.colors.textBright,
            fontWeight: 600,
            cursor: syncing ? 'wait' : 'pointer',
            opacity: syncing ? 0.7 : 1
          }}
        >
          {syncing ? 'מסנכרן...' : 'שמור שינויים'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: hintColor }}>טוען מלאי אישי...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => (
            <ContentCard key={item.product_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {item.product?.name || `מוצר ${item.product_id}`}
                  </div>
                  <div style={{ fontSize: '12px', color: hintColor }}>
                    SKU: {item.product?.sku || item.product_id}
                  </div>
                  {item.location_id && (
                    <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
                      מיקום: {item.location_id}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemove(item.product_id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ff3b30',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  הסר
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: hintColor,
                  marginBottom: '6px'
                }}>
                  כמות ברכב
                </label>
                <input
                  type="number"
                  min={0}
                  value={item.draftQuantity}
                  onChange={(e) => onQuantityChange(item.product_id, Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${tokens.colors.subtle}40`,
                    backgroundColor: tokens.colors.panel,
                    color: tokens.colors.text
                  }}
                />
              </div>
            </ContentCard>
          ))}

          {items.length === 0 && (
            <ContentCard style={{
              color: hintColor,
              textAlign: 'center'
            }}>
              אין פריטים שהוקצו
            </ContentCard>
          )}
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>הוסף מוצר חדש</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: `1px solid ${tokens.colors.subtle}40`,
              backgroundColor: tokens.colors.panel,
              color: tokens.colors.text
            }}
          >
            <option value="">בחר מוצר מהרשימה</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddClick}
            disabled={!selectedProductId}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: tokens.colors.brand.primary,
              color: tokens.colors.textBright,
              fontWeight: 600,
              cursor: selectedProductId ? 'pointer' : 'not-allowed',
              opacity: selectedProductId ? 1 : 0.6
            }}
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
