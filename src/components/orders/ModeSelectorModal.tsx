import React from 'react';
import { tokens } from '../../styles/tokens';


interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: () => void;
}

export function ModeSelectorModal({ isOpen, onClose, onSelectMode }: ModeSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...styles.card,
          maxWidth: '400px',
          width: '100%',
          padding: '32px',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: tokens.colors.text.primary,
          textAlign: 'center'
        }}>
          🎯 בחר סוג הזמנה
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: tokens.colors.text.secondary,
          textAlign: 'center'
        }}>
          איך תרצה ליצור את ההזמנה?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {

              onSelectMode();
              onClose();
            }}
            style={{
              padding: '20px',
              background: tokens.gradients.primary,
              border: 'none',
              borderRadius: '16px',
              color: tokens.colors.text.primaryBright,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: tokens.glows.primary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = tokens.glows.primaryStrong;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = tokens.glows.primary;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              הדבק מטלגרם
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              העתק הזמנה מהודעת לקוח
            </div>
          </button>

          <button
            onClick={() => {

              onSelectMode();
              onClose();
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.secondary,
              border: `2px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              color: tokens.colors.text.primary,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.borderColor = tokens.colors.background.cardBorderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              בחירת מוצרים
            </div>
            <div style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>
              בנה הזמנה עם ממשק מוצרים
            </div>
          </button>

          <button
            onClick={() => {

              onClose();
            }}
            style={{
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              color: tokens.colors.text.secondary,
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '8px'
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
