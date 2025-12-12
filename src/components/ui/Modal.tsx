import React from 'react';
import { telegramXTokens } from '../../theme/telegramx/tokens';
import { useTheme } from '../../theme/tokens';

export type ModalProps = {
  children?: React.ReactNode;
  bottomSheet?: boolean;
  tx?: boolean;
  onClose?: () => void;
};

export const Modal: React.FC<ModalProps> = ({ children, bottomSheet = false, tx = false, onClose }) => {
  const base = useTheme();
  const t = tx ? telegramXTokens : base;

  if (!bottomSheet) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: tx ? t.colors.card : base.colors.panel,
            color: tx ? t.colors.text : base.colors.text,
            borderRadius: tx ? t.radius.lg : base.radius.lg,
            boxShadow: tx ? t.shadows.lg : base.shadows.lg,
            padding: tx ? t.spacing.lg : base.spacing?.lg ?? '20px',
            minWidth: '320px',
            maxWidth: '520px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children ?? 'Modal'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: tx ? t.colors.card : base.colors.panel,
          color: tx ? t.colors.text : base.colors.text,
          borderRadius: `${t.radius.lg} ${t.radius.lg} 0 0`,
          boxShadow: tx ? t.shadows.lg : base.shadows.lg,
          padding: tx ? t.spacing.lg : base.spacing?.lg ?? '20px',
          width: '100%',
          maxWidth: '720px',
          transform: 'translateY(0)',
          transition: tx ? t.motion.base : base.transitions.base,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children ?? 'Modal'}
      </div>
    </div>
  );
};
