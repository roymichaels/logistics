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
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.colors.divider}`,
        background: tokens.colors.background.secondary,
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
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.primary,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            width: '40px',
            height: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="חזור"
        >
          ←
        </button>
      )}

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'linear-gradient(135deg, #0084FF 0%, #0073E6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '600',
            color: '#fff'
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
              backgroundColor: tokens.colors.online,
              border: `2px solid ${tokens.colors.background.secondary}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: tokens.colors.text.primary,
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
              ? tokens.colors.online
              : tokens.colors.text.secondary,
            fontWeight: '400',
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

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          style={{
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.primary,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            width: '40px',
            height: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="חיפוש"
        >
          🔍
        </button>

        <button
          style={{
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.primary,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            width: '40px',
            height: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="שיחת קול"
        >
          📞
        </button>

        <button
          style={{
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.primary,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            width: '40px',
            height: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="שיחת וידאו"
        >
          📹
        </button>

        {onInfo && (
          <button
            onClick={onInfo}
            style={{
              padding: '10px',
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.primary,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s ease',
              width: '40px',
              height: '40px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="מידע"
          >
            ⋮
          </button>
        )}
      </div>
    </div>
  );
}
