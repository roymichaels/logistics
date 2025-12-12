import React from 'react';
import type { Product } from '../../data/types';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#11182d',
        borderRadius: '16px',
        padding: '16px',
        width: '90%',
        maxWidth: '420px',
        color: '#e7e9ea',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h3 style={{ marginTop: 0 }}>{product.name}</h3>
        <p>{product.description || 'ללא תיאור'}</p>
        <p style={{ fontWeight: 800 }}>{product.price ? `₪${product.price}` : '₪—'}</p>
        <button onClick={onClose} style={{ padding: '10px 12px', borderRadius: '10px', border: 'none', background: '#2dd4bf', color: '#0b1020', fontWeight: 800, cursor: 'pointer' }}>סגור</button>
      </div>
    </div>
  );
}
