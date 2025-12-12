import React from 'react';
import { Drawer } from '../primitives/Drawer';
import type { Product } from '../../data/types';

type CartLine = { product: Product; qty: number };

type Props = {
  open: boolean;
  items: CartLine[];
  onClose: () => void;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
  onRemove: (product: Product) => void;
  onCheckout?: () => void;
  subtotal?: number;
  total?: number;
};

export default function CartDrawerNew({
  open,
  items,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  subtotal,
  total
}: Props) {
  const isEmpty = !items || items.length === 0;
  const derivedSubtotal =
    subtotal !== undefined ? subtotal : (items || []).reduce((sum, l) => sum + (l.product?.price || 0) * (l.qty || 0), 0);
  const derivedTotal = total !== undefined ? total : derivedSubtotal;

  return (
    <Drawer isOpen={open} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 16 }}>עגלה</div>

        {isEmpty && <div style={{ color: 'var(--color-text-muted)' }}>העגלה ריקה</div>}

        {!isEmpty && (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((line) => (
              <div
                key={line.product?.id || Math.random()}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: 8,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: 'var(--color-border)'
                  }}
                >
                  {line.product?.image && (
                    <img
                      src={(line.product as any).image}
                      alt={line.product?.name || 'Product'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div style={{ display: 'grid', gap: 4, color: 'var(--color-text)' }}>
                  <div style={{ fontWeight: 600 }}>{line.product?.name}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    ₪{line.product?.price ?? '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button style={pillBtn} onClick={() => onDecrement(line.product)}>-</button>
                  <div style={{ minWidth: 24, textAlign: 'center', color: 'var(--color-text)' }}>{line.qty}</div>
                  <button style={pillBtn} onClick={() => onIncrement(line.product)}>+</button>
                  <button style={removeBtn} onClick={() => onRemove(line.product)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gap: 6, color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>סיכום ביניים</span>
            <span>₪{derivedSubtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span>מס (placeholder)</span>
            <span>—</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>סה״כ</span>
            <span>₪{derivedTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            סגור
          </button>
          <button
            onClick={onCheckout}
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
            לתשלום
          </button>
        </div>
      </div>
    </Drawer>
  );
}

const pillBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  cursor: 'pointer'
};

const removeBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  cursor: 'pointer'
};
