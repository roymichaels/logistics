import React from 'react';

type StepperProps = {
  steps: string[];
  current: number;
};

export const SGStepper: React.FC<StepperProps> = ({ steps, current }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {steps.map((_, idx) => {
        const active = idx <= current;
        return (
          <div
            key={idx}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: active ? '#1d9bf0' : 'rgba(255,255,255,0.2)',
              transition: '180ms ease',
            }}
          />
        );
      })}
    </div>
  );
};

export default SGStepper;
