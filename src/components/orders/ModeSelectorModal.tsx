import React from 'react';
import { telegram } from '../../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../../styles/royalTheme';

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
          ...ROYAL_STYLES.card,
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
          color: ROYAL_COLORS.text,
          textAlign: 'center'
        }}>
          🎯 בחר סוג הזמנה
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: ROYAL_COLORS.muted,
          textAlign: 'center'
        }}>
          איך תרצה ליצור את ההזמנה?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              telegram.hapticFeedback('impact', 'medium');
              onSelectMode();
              onClose();
            }}
            style={{
              padding: '20px',
              background: ROYAL_COLORS.gradientPurple,
              border: 'none',
              borderRadius: '16px',
              color: ROYAL_COLORS.textBright,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: ROYAL_COLORS.glowPurple
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurpleStrong;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurple;
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
              telegram.hapticFeedback('impact', 'medium');
              onSelectMode();
              onClose();
            }}
            style={{
              padding: '20px',
              background: ROYAL_COLORS.secondary,
              border: `2px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '16px',
              color: ROYAL_COLORS.text,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              בחירת מוצרים
            </div>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
              בנה הזמנה עם ממשק מוצרים
            </div>
          </button>

          <button
            onClick={() => {
              telegram.hapticFeedback('selection');
              onClose();
            }}
            style={{
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              color: ROYAL_COLORS.muted,
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
