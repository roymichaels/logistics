import React, { useRef } from 'react';
import { migrationFlags } from '../../migration/flags';
import { useNavController } from '../../migration/controllers/navController';

type NavHeaderProps = {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  avatar?: React.ReactNode;
  avatarUrl?: string;
  onAvatarClick?: (anchorEl: HTMLElement | null) => void;
  onNavigate?: (path: string) => void;
  onMenuClick?: (anchorEl: HTMLElement | null) => void;
  onBusinessContextClick?: (anchorEl: HTMLElement | null) => void;
};

export function NavHeader({
  title,
  subtitle,
  actions,
  showBackButton,
  onBack,
  avatar,
  avatarUrl,
  onAvatarClick,
  onMenuClick,
  onBusinessContextClick
}: NavHeaderProps) {
  const avatarRef = useRef<HTMLButtonElement>(null);
  const nav = (() => {
    try {
      return useNavController();
    } catch {
      return null;
    }
  })();
  const showBack = showBackButton || (migrationFlags.navigation && !!nav?.canGoBack);
  const handleBack = () => {
    if (migrationFlags.navigation && nav?.canGoBack) {
      nav.back();
      return;
    }
    onBack?.();
  };

  return (
    <header
      style={{
        width: '100%',
        height: '56px',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        boxSizing: 'border-box',
        WebkitPaddingStart: 'max(12px, env(safe-area-inset-left))',
        WebkitPaddingEnd: 'max(12px, env(safe-area-inset-right))',
        WebkitPaddingBefore: 'max(0px, env(safe-area-inset-top))'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Back"
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            ←
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              color: 'var(--color-text)',
              fontWeight: 700,
              fontSize: 'clamp(14px, 3vw, 16px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={typeof title === 'string' ? title : undefined}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={typeof subtitle === 'string' ? subtitle : undefined}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '40vw'
          }}
        >
          {actions}
        </div>
        <button
          ref={avatarRef}
          onClick={() => {
            onAvatarClick?.(avatarRef.current);
            onMenuClick?.(avatarRef.current);
          }}
          aria-label="User menu"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-panel)',
            color: 'var(--color-text)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            avatar || '🙂'
          )}
        </button>
      </div>
    </header>
  );
}

export default NavHeader;
