import React from 'react';

type Props = {
  price: number | null;
  currency?: string;
};

export function ProductPriceBlock({ price, currency = '₪' }: Props) {
  return (
    <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 18 }}>
      {price != null ? `${currency}${price}` : '—'}
    </div>
  );
}

export default ProductPriceBlock;
