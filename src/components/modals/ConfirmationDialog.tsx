import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../atoms/Button';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireConfirmation?: boolean;
  confirmationText?: string;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireConfirmation = false,
  confirmationText = 'DELETE',
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setInputValue('');
      setError(null);
      setIsConfirming(false);
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (requireConfirmation && inputValue !== confirmationText) {
      setError(`Please type "${confirmationText}" to confirm`);
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirm, onClose, requireConfirmation, inputValue, confirmationText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isConfirming) {
        handleConfirm();
      } else if (e.key === 'Escape' && !isConfirming) {
        onClose();
      }
    },
    [handleConfirm, onClose, isConfirming]
  );

  if (!open) return null;

  const variantColors = {
    danger: {
      bg: '#fef2f2',
      border: '#fecaca',
      icon: '#dc2626',
      iconBg: '#fee2e2',
      buttonBg: '#dc2626',
      buttonHover: '#b91c1c',
    },
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      icon: '#f59e0b',
      iconBg: '#fef3c7',
      buttonBg: '#f59e0b',
      buttonHover: '#d97706',
    },
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      icon: '#3b82f6',
      iconBg: '#dbeafe',
      buttonBg: '#3b82f6',
      buttonHover: '#2563eb',
    },
  };

  const colors = variantColors[variant];

  const iconEmoji = variant === 'danger' ? '⚠️' : variant === 'warning' ? '⚠️' : 'ℹ️';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-message"
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            padding: '24px',
            backgroundColor: colors.bg,
            borderBottom: `2px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              backgroundColor: colors.iconBg,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            {iconEmoji}
          </div>

          <h2
            id="confirmation-dialog-title"
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            {title}
          </h2>

          <p
            id="confirmation-dialog-message"
            style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: '1.6',
              marginBottom: 0,
            }}
          >
            {message}
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          {requireConfirmation && (
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="confirmation-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Type <strong>{confirmationText}</strong> to confirm:
              </label>
              <input
                id="confirmation-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmationText}
                disabled={isConfirming}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: `2px solid ${error ? colors.icon : '#d1d5db'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                autoFocus
                onFocus={(e) => {
                  e.target.style.borderColor = colors.icon;
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                padding: '12px',
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                color: colors.icon,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={isConfirming}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: '#ffffff',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                cursor: isConfirming ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isConfirming ? 0.5 : 1,
              }}
              onMouseOver={(e) => {
                if (!isConfirming) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              {cancelText}
            </button>

            <button
              onClick={handleConfirm}
              disabled={isConfirming || (requireConfirmation && inputValue !== confirmationText)}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ffffff',
                backgroundColor: colors.buttonBg,
                border: 'none',
                borderRadius: '8px',
                cursor:
                  isConfirming || (requireConfirmation && inputValue !== confirmationText)
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'all 0.2s',
                opacity:
                  isConfirming || (requireConfirmation && inputValue !== confirmationText) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => {
                if (
                  !isConfirming &&
                  !(requireConfirmation && inputValue !== confirmationText)
                ) {
                  e.currentTarget.style.backgroundColor = colors.buttonHover;
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.buttonBg;
              }}
            >
              {isConfirming && (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              )}
              {isConfirming ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ConfirmationDialog;
