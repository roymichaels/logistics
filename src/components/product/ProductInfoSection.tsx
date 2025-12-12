import React from 'react';
import { Card } from '../primitives/Card';
import { Section } from '../primitives/Section';

type Props = {
  title: string;
  description: string;
};

export function ProductInfoSection({ title, description }: Props) {
  return (
    <Section title={title}>
      <Card>
        <div style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
          {description || 'אין תיאור'}
        </div>
      </Card>
    </Section>
  );
}

export default ProductInfoSection;
