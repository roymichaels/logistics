import React, { useMemo } from 'react';
import { Drawer } from '../primitives/Drawer';
import { Modal } from '../primitives/Modal';
import type { Product } from '../../data/types';
import { migrationFlags } from '../../migration/flags';

type Props = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onOpenCart?: () => void;
};

export default function ProductDetailsSheetNew({ open, product, onClose, onAddToCart, onOpenCart }: Props) {
  const isMobile = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : true), []);

  const content = (
    <div style={{ display: 'grid', gap: 12 }}>
      {product?.image && (
        <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: 'var(--color-border)' }}>
          <img
            src={(product as any).image}
            alt={product?.name || 'Product'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 16 }}>{product?.name || 'Product'}</div>
      {product?.description && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{product.description}</div>
      )}
      <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>
        {product?.price != null ? `₪${product.price}` : '—'}
      </div>
      {product && Array.isArray((product as any).tags) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(product as any).tags.map((tag: string) => (
            <span
              key={tag}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: 12
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
          onClick={() => {
            if (product && onAddToCart) {
              onAddToCart(product);
              if (migrationFlags.drawerAutoOpen && onOpenCart) {
                onOpenCart();
              }
            }
          }}
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
          onClick={onClose}
          style={{
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
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer isOpen={open} onClose={onClose}>
        {content}
      </Drawer>
    );
  }

  return (
    <Modal isOpen={open} onClose={onClose}>
      {content}
    </Modal>
  );
}
