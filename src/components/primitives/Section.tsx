import React from 'react';

type SectionProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Section({ title, children, className }: SectionProps) {
  return (
    <section
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '8px 0'
      }}
    >
      {title && (
        <h2
          style={{
            margin: 0,
            color: 'var(--color-text)',
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: 1.3
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
