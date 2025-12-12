import React from 'react';

type ModalHeaderProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
};

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  if (!title && !subtitle && !onClose) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {title && (
          <div
            style={{
              color: 'var(--color-text)',
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 13,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-pill)',
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
