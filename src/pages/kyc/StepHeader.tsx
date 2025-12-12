import React from 'react';
import { progressContainer, progressTrack, progressFill, headingStyle, subheadingStyle, chipInfo } from './kycStyles';

type Props = {
  step: number;
  total: number;
  eta?: string;
  title: string;
  subtitle: string;
  hint?: string;
};

export const StepHeader: React.FC<Props> = ({ step, total, eta, title, subtitle, hint }) => {
  const percent = Math.min(100, Math.max(0, Math.round((step / total) * 100)));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={progressContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#9fb6cb', fontSize: 12 }}>
          <span>צעד {step} מתוך {total}</span>
          {eta && <span>{eta}</span>}
        </div>
        <div style={progressTrack}>
          <div style={progressFill(percent)} />
        </div>
      </div>
      <h2 style={{ ...headingStyle, marginTop: 8 }}>{title}</h2>
      <p style={subheadingStyle}>{subtitle}</p>
      {hint && (
        <div style={{ marginBottom: 8 }}>
          <span style={chipInfo}>{hint}</span>
        </div>
      )}
    </div>
  );
};

export default StepHeader;
