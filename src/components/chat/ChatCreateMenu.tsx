import React from 'react';
import { tokens } from '../../styles/tokens';

interface ChatCreateMenuProps {
  isOpen: boolean;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onHaptic: () => void;
}

export function ChatCreateMenu({ isOpen, onCreateGroup, onCreateChannel, onHaptic }: ChatCreateMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '8px',
        background: tokens.colors.background.card,
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 1001,
        minWidth: '200px',
        overflow: 'hidden'
      }}
    >
      <button
        onClick={() => {
          onHaptic();
          onCreateGroup();
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          color: tokens.colors.text,
          fontSize: '16px',
          textAlign: 'right',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '24px' }}>👥</span>
        <span style={{ fontWeight: '600' }}>קבוצה חדשה</span>
      </button>
      <div style={{ height: '1px', background: tokens.colors.background.cardBorder }} />
      <button
        onClick={() => {
          onHaptic();
          onCreateChannel();
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          color: tokens.colors.text,
          fontSize: '16px',
          textAlign: 'right',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '24px' }}>📢</span>
        <span style={{ fontWeight: '600' }}>ערוץ חדש</span>
      </button>
    </div>
  );
}
