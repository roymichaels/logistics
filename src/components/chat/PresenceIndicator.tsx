import React from 'react';
import type { PresenceStatus } from '@/types/messaging';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  customStatus?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: '#28a745',
  away: '#ffc107',
  dnd: '#dc3545',
  offline: '#6c757d',
};

const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const SIZE_MAP = {
  small: 8,
  medium: 12,
  large: 16,
};

export function PresenceIndicator({
  status,
  customStatus,
  size = 'medium',
  showLabel = false,
}: PresenceIndicatorProps) {
  const dotSize = SIZE_MAP[size];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: dotSize,
          height: dotSize,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: STATUS_COLORS[status],
            border: '2px solid white',
          }}
        />
        {status === 'online' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: STATUS_COLORS[status],
              animation: 'presence-pulse 2s ease-in-out infinite',
              opacity: 0.5,
            }}
          >
            <style>
              {`
                @keyframes presence-pulse {
                  0%, 100% {
                    transform: scale(1);
                    opacity: 0.5;
                  }
                  50% {
                    transform: scale(1.5);
                    opacity: 0;
                  }
                }
              `}
            </style>
          </div>
        )}
      </div>

      {showLabel && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: size === 'small' ? '11px' : size === 'medium' ? '13px' : '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {STATUS_LABELS[status]}
          </span>
          {customStatus && (
            <span
              style={{
                fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
                color: 'var(--text-secondary)',
              }}
            >
              {customStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface UserPresenceBadgeProps {
  name: string;
  status: PresenceStatus;
  customStatus?: string;
  avatarUrl?: string;
  size?: 'small' | 'medium' | 'large';
}

export function UserPresenceBadge({
  name,
  status,
  customStatus,
  avatarUrl,
  size = 'medium',
}: UserPresenceBadgeProps) {
  const avatarSize = size === 'small' ? 32 : size === 'medium' ? 40 : 48;
  const fontSize = size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ position: 'relative' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color, #007bff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: fontSize,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        >
          <PresenceIndicator status={status} size={size} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontSize: fontSize,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {name}
        </span>
        {customStatus && (
          <span
            style={{
              fontSize: size === 'small' ? '11px' : size === 'medium' ? '12px' : '14px',
              color: 'var(--text-secondary)',
            }}
          >
            {customStatus}
          </span>
        )}
      </div>
    </div>
  );
}
