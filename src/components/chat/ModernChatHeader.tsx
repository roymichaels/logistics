import React from 'react';
import { tokens } from '../../styles/tokens';

interface ModernChatHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  memberCount?: number;
  onBack?: () => void;
  onInfo?: () => void;
}

export function ModernChatHeader({
  name,
  avatar,
  isOnline = false,
  isTyping = false,
  memberCount,
  onBack,
  onInfo
}: ModernChatHeaderProps) {
  const userInitial = name[0]?.toUpperCase() || 'U';

  return (
    <div
      style={{
        padding: '16px',
        borderBottom: `1px solid ${tokens.colors.background.cardBorder}`,
        background: tokens.colors.background.card,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text,
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          →
        </button>
      )}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: '#fff',
            border: `2px solid ${tokens.colors.background.cardBorder}`
          }}
        >
          {!avatar && userInitial}
        </div>
        {isOnline && (
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#34c759',
              border: `2px solid ${tokens.colors.background.card}`,
              boxShadow: '0 2px 4px rgba(52, 199, 89, 0.4)'
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: '700',
            color: tokens.colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {name}
        </h2>
        <p
          style={{
            margin: '2px 0 0 0',
            fontSize: '13px',
            color: isTyping
              ? tokens.colors.brand.primary
              : isOnline
              ? '#34c759'
              : tokens.colors.subtle,
            fontWeight: '500',
            fontStyle: isTyping ? 'italic' : 'normal'
          }}
        >
          {isTyping
            ? 'מקליד...'
            : memberCount
            ? `${memberCount} חברים`
            : isOnline
            ? 'פעיל עכשיו'
            : 'לא מחובר'}
        </p>
      </div>

      {onInfo && (
        <button
          onClick={onInfo}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="מידע"
        >
          ⓘ
        </button>
      )}
    </div>
  );
}
