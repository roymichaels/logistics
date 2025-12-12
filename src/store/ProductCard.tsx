import React from 'react';
import type { Product } from '../data/types';

interface ProductCardProps {
  product: Product;
  onAdd: () => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #1a0b2e, #0c0616)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '14px',
        color: '#e7e9ea',
        boxShadow: '0 10px 28px rgba(0,0,0,0.38)',
        transition: 'all 0.28s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(142, 69, 255, 0.35)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.02)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(0,0,0,0.38)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <div style={{
          height: '160px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(108,92,231,0.25))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '46px',
          opacity: 0.9
        }}>
          🛍️
        </div>
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '8px 12px',
          borderRadius: '16px',
          background: '#2dd4bf',
          color: '#0b1020',
          fontWeight: 800
        }}>
          {product.price ? `₪${product.price}` : '₪—'}
        </div>
      </div>

      <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>{product.name}</div>
      <div style={{ color: '#aab4c8', fontSize: '13px', minHeight: '36px' }}>{product.description || 'ללא תיאור'}</div>

      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6c8cff', fontWeight: 700, fontSize: '13px' }}>{product.category || 'כללי'}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6c5ce7, #00d4ff)',
            color: '#0b1020',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          הוספה לעגלה
        </button>
      </div>
    </div>
  );
}
