import React from 'react';
import { tokens } from '../../theme/tokens';

export type ActivityType = 'call' | 'email' | 'meeting' | 'deal' | 'order' | 'alert' | 'user' | 'business' | 'system';

export interface ActivityItemProps {
  type: ActivityType;
  message: string;
  time: string;
  icon?: string;
  onClick?: () => void;
  onDelete?: () => void;
  isRead?: boolean;
  showActions?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const typeIcons: Record<ActivityType, string> = {
  call: '📞',
  email: '📧',
  meeting: '📅',
  deal: '💰',
  order: '📦',
  alert: '⚠️',
  user: '👤',
  business: '🏢',
  system: '⚙️',
};

const typeColors: Record<ActivityType, string> = {
  call: tokens.colors.primary[500],
  email: tokens.colors.semantic.info,
  meeting: '#8b5cf6',
  deal: tokens.colors.semantic.success,
  order: tokens.colors.primary[600],
  alert: tokens.colors.semantic.warning,
  user: '#06b6d4',
  business: '#f59e0b',
  system: tokens.colors.neutral[500],
};

export function ActivityItem({
  type,
  message,
  time,
  icon,
  onClick,
  onDelete,
  isRead = true,
  showActions = false,
  className,
  style,
}: ActivityItemProps) {
  const displayIcon = icon || typeIcons[type];
  const bgColor = typeColors[type];

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px',
        backgroundColor: isRead ? 'transparent' : tokens.colors.primary[50] + '50',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = isRead ? 'transparent' : tokens.colors.primary[50] + '50';
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          flexShrink: 0,
          fontSize: '18px',
          backgroundColor: bgColor + '15',
          borderRadius: '8px',
        }}
      >
        {displayIcon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: isRead ? 400 : 600,
            color: tokens.colors.text.primary,
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '12px',
            color: tokens.colors.text.secondary,
          }}
        >
          {time}
        </p>
      </div>

      {showActions && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                padding: 0,
                fontSize: '14px',
                color: tokens.colors.text.secondary,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.semantic.error + '15';
                e.currentTarget.style.color = tokens.colors.semantic.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = tokens.colors.text.secondary;
              }}
              aria-label="Delete activity"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}
