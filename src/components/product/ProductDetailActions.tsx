import React from 'react';
import type { Product } from '../../data/types';

type Props = {
  product: Product | null;
  onAddToCart?: (p: Product) => void;
  onBack?: () => void;
};

export function ProductDetailActions({ product, onAddToCart, onBack }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => product && onAddToCart?.(product)}
        style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-primary)',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        הוסף לעגלה
      </button>
      <button
        onClick={onBack}
        style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text)',
          cursor: 'pointer'
        }}
      >
        חזרה
      </button>
    </div>
  );
}

export default ProductDetailActions;
