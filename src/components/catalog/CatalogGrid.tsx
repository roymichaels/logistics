import React, { useState } from 'react';
import type { Product } from '../../data/types';
import { ProductModal } from './ProductModal';

interface CatalogGridProps {
  products: Product[];
}

const badgeColor = (type?: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('דיגיטל') || t.includes('digital')) return '#2dd4bf';
  if (t.includes('שירות') || t.includes('service')) return '#f6c945';
  return '#5c7cfa';
};

export function CatalogGrid({ products }: CatalogGridProps) {
  const [active, setActive] = useState<Product | null>(null);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '14px' }}>
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() => setActive(product)}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #1a0b2e, #0c0616)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              cursor: 'pointer',
              transform: 'translateY(0)',
              transition: 'all 0.28s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(142, 69, 255, 0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.03)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '6px 10px',
              borderRadius: '20px',
              background: badgeColor(product.category),
              color: '#0b1020',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              {product.price ? `₪${product.price}` : '₪—'}
            </div>

            <div style={{ height: '140px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(108,92,231,0.18))', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ opacity: 0.85, fontSize: '42px' }}>🛒</div>
            </div>

            <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>{product.name}</div>
            <div style={{ color: '#aab4c8', fontSize: '13px', minHeight: '38px' }}>{product.description || 'ללא תיאור'}</div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6c8cff', fontWeight: 700, fontSize: '13px' }}>{product.category || 'כללי'}</span>
              <span style={{ color: '#5c7cfa', fontWeight: 800 }}>{product.price ? `₪${product.price}` : ''}</span>
            </div>
          </div>
        ))}
      </div>

      {active && <ProductModal product={active} onClose={() => setActive(null)} />}
    </>
  );
}
