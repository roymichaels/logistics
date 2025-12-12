import React from 'react';
import { Surface } from '../../components/layout/Surface';
import { Section } from '../../components/primitives/Section';
import { Card } from '../../components/primitives/Card';
import { useNavController } from '../controllers/navController';

export default function DeliveryPageMigration(props: any) {
  const nav = useNavController();
  const { id } = props || {};

  return (
    <Surface>
      <Section title="Delivery Detail">
        <Card>
          <div style={{ color: 'var(--color-text)' }}>Delivery ID: {id || 'N/A'}</div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Status: Pending</div>
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
