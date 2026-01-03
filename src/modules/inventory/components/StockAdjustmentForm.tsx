import React, { useState } from 'react';
import { Card } from '../../../components/molecules/Card';
import { tokens, styles } from '../../../styles/tokens';
import type { AggregatedInventory, StockAdjustment } from '../types';

interface StockAdjustmentFormProps {
  product: AggregatedInventory;
  onSubmit: (adjustment: StockAdjustment) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function StockAdjustmentForm({ product, onSubmit, onCancel, loading }: StockAdjustmentFormProps) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!reason || !product.items[0]?.id) return;

    await onSubmit({
      inventory_id: product.items[0].id,
      quantity_change: quantity,
      reason,
    });
  };

  return (
    <ContentCard>
      <h2 style={{
        color: tokens.colors.text,
        marginBottom: '20px',
        fontSize: '20px',
        fontWeight: '600',
      }}>
        עדכן מלאי - {product.product_name}
      </h2>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: tokens.colors.text,
          fontSize: '14px',
        }}>
          כמות (שינוי)
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          style={styles.input}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          color: tokens.colors.text,
          fontSize: '14px',
        }}>
          סיבה
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="למה המלאי משתנה?"
          style={styles.input}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !reason}
          style={{
            ...styles.button.primary,
            flex: 1,
            opacity: (loading || !reason) ? 0.5 : 1,
            cursor: (loading || !reason) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'מעדכן...' : 'עדכן'}
        </button>
        <button
          onClick={onCancel}
          style={{
            ...styles.button.secondary,
            flex: 1
          }}
        >
          ביטול
        </button>
      </div>
    </ContentCard>
  );
}
