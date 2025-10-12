import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryButton?: {
    text: string;
    onClick: () => void;
  };
  secondaryButton?: {
    text: string;
    onClick: () => void;
  };
}

export function TelegramModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  primaryButton,
  secondaryButton 
}: TelegramModalProps) {
  const { theme, haptic } = useTelegramUI();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      direction: 'rtl'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '320px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            {title}
          </h2>
          <button
            onClick={() => {
              haptic();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: theme.hint_color,
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '24px' }}>
          {children}
        </div>

        {/* Buttons */}
        {(primaryButton || secondaryButton) && (
          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: secondaryButton ? 'row' : 'column'
          }}>
            {secondaryButton && (
              <button
                onClick={() => {
                  haptic();
                  secondaryButton.onClick();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `1px solid ${theme.button_color}`,
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: theme.button_color,
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {secondaryButton.text}
              </button>
            )}
            {primaryButton && (
              <button
                onClick={() => {
                  haptic();
                  primaryButton.onClick();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: theme.button_color,
                  color: theme.button_text_color,
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {primaryButton.text}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}