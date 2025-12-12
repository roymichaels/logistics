import React, { useEffect } from 'react';
import UnifiedShellRouter from '../migration/UnifiedShellRouter';
import { Card } from '../components/primitives/Card';
import { Section } from '../components/primitives/Section';
import { Surface } from '../components/layout/Surface';
import { usePageTitle } from '../hooks/usePageTitle';
import { useKycFlow } from '../migration/useKycFlow';
import { useDataSandbox } from '../migration/data/useDataSandbox';

const steps = ['ID Upload', 'Selfie', 'Details', 'Review'];

function KYCFlowNewContent(props: { onNavigate?: (path: string) => void }) {
  const { setTitle, setSubtitle } = usePageTitle();
  const { state, step, next, back, update, canSubmit, submit } = useKycFlow();
  const sandbox = useDataSandbox();

  useEffect(() => {
    setTitle('Verification');
    setSubtitle(steps[step]);
  }, [setTitle, setSubtitle, step]);

  const goNext = () => {
    next();
    props.onNavigate?.(`/store/kyc/step-${step + 2}`);
  };

  const goBack = () => {
    back();
    props.onNavigate?.(`/store/kyc/step-${step}`);
  };

  const handleSubmit = () => {
    submit();
    if (sandbox.active) {
      sandbox.updateSandbox({
        user: { ...(sandbox.sandbox.user as any), kycStatus: 'submitted', kycStep: 'submitted' }
      });
    }
    props.onNavigate?.('/store/kyc/review');
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Card>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{steps[step]}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>
              Paste references for ID front/back (no upload).
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                placeholder="ID front reference"
                value={state.idFront || ''}
                onChange={(e) => update('idFront', e.target.value)}
                style={{ padding: 8, width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
              />
              <input
                type="text"
                placeholder="ID back reference"
                value={state.idBack || ''}
                onChange={(e) => update('idBack', e.target.value)}
                style={{ padding: 8, width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
              />
            </div>
          </Card>
        );
      case 1:
        return (
          <Card>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{steps[step]}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>Selfie placeholder</div>
            <input
              type="text"
              placeholder="Selfie reference"
              value={state.selfie || ''}
              onChange={(e) => update('selfie', e.target.value)}
              style={{ marginTop: 10, padding: 8, width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
            />
          </Card>
        );
      case 2:
        return (
          <Card>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{steps[step]}</div>
            <input
              type="text"
              placeholder="Full name"
              value={state.fullName || ''}
              onChange={(e) => update('fullName', e.target.value)}
              style={{ marginTop: 8, padding: 8, width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
            />
            <textarea
              placeholder="Social links (comma separated)"
              value={(state.socialLinks || []).join(', ')}
              onChange={(e) => update('socialLinks', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
              style={{ marginTop: 8, padding: 8, width: '100%', minHeight: 80, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
            />
          </Card>
        );
      default:
        return (
          <Card>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{steps[step]}</div>
            <div style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
              Check your info and submit. Status: {state.status}
            </div>
          </Card>
        );
    }
  };

  return (
    <Surface>
      <Section title="KYC Flow (New)">
        <div style={{ display: 'grid', gap: 12 }}>
          {renderStep()}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={goBack}
              disabled={step === 0}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text)',
                cursor: step === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Back
            </button>
            {step < steps.length - 1 && (
              <button
                onClick={goNext}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Next
              </button>
            )}
            {step === steps.length - 1 && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: canSubmit ? 'var(--color-primary)' : 'var(--color-border)',
                  color: '#fff',
                  cursor: canSubmit ? 'pointer' : 'not-allowed'
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </Section>
    </Surface>
  );
}

export function KYCFlowNew(props: Record<string, unknown>) {
  return (
    <UnifiedShellRouter>
      <KYCFlowNewContent {...props} />
    </UnifiedShellRouter>
  );
}

export default KYCFlowNew;
