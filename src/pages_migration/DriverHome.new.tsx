import React, { useEffect } from 'react';
import { Card } from '../components/primitives/Card';
import { Section } from '../components/primitives/Section';
import { Surface } from '../components/layout/Surface';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';

function DriverHomeNewContent() {
  const { setTitle, setSubtitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const deliveries = sandbox.active ? sandbox.sandbox.deliveries : [];

  useEffect(() => {
    setTitle('Driver');
    setSubtitle('Status');
  }, [setTitle, setSubtitle]);

  return (
    <Surface>
      <Section title="Current Job">
        <Card>
          <div style={{ color: 'var(--color-text)' }}>No active job</div>
        </Card>
      </Section>
      <Section title="Upcoming Deliveries">
        <Card>
          {deliveries && deliveries.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {deliveries.map((d: any) => (
                <button
                  key={d.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onClick={() => nav.push('delivery', { id: d.id })}
                >
                  {d.id} — {d.status}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--color-text)' }}>No scheduled deliveries</div>
          )}
          <button
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
            onClick={() => nav.push('delivery', { id: 'demo-delivery' })}
          >
            View delivery
          </button>
        </Card>
      </Section>
    </Surface>
  );
}

export function DriverHomeNew(props: Record<string, unknown>) {
  return <DriverHomeNewContent {...props} />;
}

export default DriverHomeNew;
