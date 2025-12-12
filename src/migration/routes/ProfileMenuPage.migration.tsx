import React from 'react';
import { Surface } from '../../components/layout/Surface';
import { Section } from '../../components/primitives/Section';
import { Card } from '../../components/primitives/Card';
import { useNavController } from '../controllers/navController';

export default function ProfileMenuPageMigration() {
  const nav = useNavController();

  return (
    <Surface>
      <Section title="Profile Menu">
        <Card>
          <div style={{ display: 'grid', gap: 8 }}>
            <button style={btnStyle} onClick={() => nav.back()}>View profile</button>
            <button style={btnStyle} onClick={() => nav.back()}>Settings</button>
            <button style={btnStyle} onClick={() => nav.back()}>Logout</button>
          </div>
        </Card>
      </Section>
    </Surface>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  cursor: 'pointer',
  textAlign: 'left'
};
