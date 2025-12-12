import React from 'react';
import type { Product } from '../../data/types';
import ProductCardNew from './ProductCard.new';

type CatalogGridNewProps = {
  products: Product[];
  onSelect?: (p: Product) => void;
  onAddToCart?: (p: Product) => void;
};

export default function CatalogGridNew({ products, onSelect, onAddToCart }: CatalogGridNewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '12px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(140px, 33vw, 200px), 1fr))'
      }}
    >
      {products.map((p) => (
        <ProductCardNew
          key={p.id}
          product={p}
          onSelect={onSelect ? () => onSelect(p) : undefined}
          onAddToCart={onAddToCart ? () => onAddToCart(p) : undefined}
        />
      ))}
    </div>
  );
}
