import React from 'react';
import { Surface } from '../../components/layout/Surface';
import { Section } from '../../components/primitives/Section';
import { Card } from '../../components/primitives/Card';
import { useNavController } from '../controllers/navController';

export default function ProductPageMigration(props: any) {
  const nav = useNavController();
  const { product } = props || {};
  return (
    <Surface>
      <Section title="Product">
        <Card>
          <div style={{ display: 'grid', gap: 8, color: 'var(--color-text)' }}>
            <div style={{ fontWeight: 700 }}>{product?.name || 'Product'}</div>
            <div>{product?.description || 'Description not available.'}</div>
            {product?.price != null && <div>₪{product.price}</div>}
          </div>
        </Card>
      </Section>
      <button
        onClick={() => nav.back()}
        style={{
          marginTop: 12,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text)',
          cursor: 'pointer'
        }}
      >
        Back
      </button>
    </Surface>
  );
}
