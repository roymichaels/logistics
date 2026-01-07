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
        padding: '14px 16px',
        borderBottom: `1px solid ${tokens.colors.border.default}`,
        background: tokens.colors.background.card,
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)'
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
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'linear-gradient(135deg, #1D9BF0, #7B3FF2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '700',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
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
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#34c759',
              border: `3px solid ${tokens.colors.background.card}`,
              boxShadow: '0 2px 6px rgba(52, 199, 89, 0.5)'
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
            color: tokens.colors.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px'
          }}
        >
          {name}
        </h2>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: isTyping
              ? tokens.colors.brand.primary
              : isOnline
              ? '#34c759'
              : tokens.colors.text.secondary,
            fontWeight: '500',
            fontStyle: isTyping ? 'italic' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isTyping && <span style={{ fontSize: '14px' }}>⌨️</span>}
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
