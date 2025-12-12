import React from 'react';
import { Surface } from '../../components/layout/Surface';
import { Section } from '../../components/primitives/Section';
import { Card } from '../../components/primitives/Card';
import { useNavController } from '../controllers/navController';

export default function MetricsPageMigration() {
  const nav = useNavController();
  return (
    <Surface>
      <Section title="Metrics">
        <Card>
          <div style={{ display: 'grid', gap: 6, color: 'var(--color-text)' }}>
            <div>Orders: —</div>
            <div>Revenue: —</div>
            <div>Conversion: —</div>
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
