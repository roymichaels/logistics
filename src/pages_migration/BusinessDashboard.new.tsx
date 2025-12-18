import React, { useEffect } from 'react';
import { Card } from '../components/primitives/Card';
import { Section } from '../components/primitives/Section';
import { Surface } from '../components/layout/Surface';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';

const cards = ['Orders', 'Inventory', 'Performance'];

function BusinessDashboardNewContent() {
  const { setTitle, setSubtitle } = usePageTitle();
  const nav = useNavController();
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const sandbox = useDataSandbox();

  useEffect(() => {
    setTitle('Dashboard');
    setSubtitle('Business');
  }, [setTitle, setSubtitle]);

  return (
    <Surface>
      <Section title="Business Dashboard (New)">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {cards.map((label) => (
            <Card key={label}>
              <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{label}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Placeholder</div>
              <button
                ref={anchorRef}
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer'
                }}
                onClick={(e) => nav.push('metrics', { anchorEl: e.currentTarget })}
              >
                View metrics
              </button>
            </Card>
          ))}
        </div>
      </Section>
    </Surface>
  );
}

export function BusinessDashboardNew(props: Record<string, unknown>) {
  return <BusinessDashboardNewContent {...props} />;
}

export default BusinessDashboardNew;
