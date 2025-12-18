import React from 'react';
import { Surface } from '../components/layout/Surface';
import { Section } from '../components/primitives/Section';
import { Card } from '../components/primitives/Card';
import { useKycFlow } from '../migration/useKycFlow';
import { usePageTitle } from '../hooks/usePageTitle';

function KYCReviewContent({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { state, submit } = useKycFlow();
  const { setTitle, setSubtitle } = usePageTitle();

  React.useEffect(() => {
    setTitle('Verification');
    setSubtitle('Review');
  }, [setTitle, setSubtitle]);

  return (
    <Surface>
      <Section title="Review">
        <Card>
          <div style={{ display: 'grid', gap: 8, color: 'var(--color-text)' }}>
            <div><strong>ID Front:</strong> {state.idFront || 'Not provided'}</div>
            <div><strong>ID Back:</strong> {state.idBack || 'Not provided'}</div>
            <div><strong>Selfie:</strong> {state.selfie || 'Not provided'}</div>
            <div><strong>Full Name:</strong> {state.fullName || 'Not provided'}</div>
            <div><strong>Social Links:</strong> {(state.socialLinks || []).join(', ') || 'None'}</div>
            <div><strong>Status:</strong> {state.status}</div>
          </div>
        </Card>
      </Section>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => onNavigate?.('/store/kyc')}
          style={{
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
        <button
          onClick={() => {
            submit();
            onNavigate?.('/store/kyc');
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-primary)',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Submit
        </button>
      </div>
    </Surface>
  );
}

export default function KYCReviewNew(props: any) {
  return <KYCReviewContent {...props} />;
}
