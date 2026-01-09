import React, { useState } from 'react';
import { tokens } from '../../../styles/tokens';
import { logger } from '../../../lib/logger';

interface EditContactInfoModalProps {
  currentEmail?: string;
  currentPhone?: string;
  onSave: (data: { public_email?: string; public_phone?: string }) => Promise<void>;
  onClose: () => void;
}

export function EditContactInfoModal({
  currentEmail,
  currentPhone,
  onSave,
  onClose,
}: EditContactInfoModalProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [phone, setPhone] = useState(currentPhone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        public_email: email.trim() || undefined,
        public_phone: phone.trim() || undefined,
      });
      onClose();
    } catch (err) {
      logger.error('[EditContactInfoModal] Save failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValid = validateEmail(email);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: tokens.colors.background.card,
          borderRadius: '16px',
          padding: '0',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${tokens.colors.border.default}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: 700,
                color: tokens.colors.text,
              }}
            >
              📞 Contact Information
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: tokens.colors.subtle,
              }}
            >
              Add or update your public contact details
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: tokens.colors.subtle,
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.text,
                marginBottom: '8px',
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@business.com"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                color: tokens.colors.text,
                backgroundColor: tokens.colors.bg,
                border: `2px solid ${!isValid && email ? tokens.colors.error : tokens.colors.border.default}`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                if (isValid || !email) {
                  e.currentTarget.style.borderColor = tokens.colors.primary;
                }
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value || isValid) {
                  e.currentTarget.style.borderColor = tokens.colors.border.default;
                }
              }}
            />
            {email && !isValid && (
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: tokens.colors.error,
                }}
              >
                Please enter a valid email address
              </div>
            )}
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: tokens.colors.subtle,
              }}
            >
              Customers can email you at this address
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: tokens.colors.text,
                marginBottom: '8px',
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                color: tokens.colors.text,
                backgroundColor: tokens.colors.bg,
                border: `2px solid ${tokens.colors.border.default}`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.default;
              }}
            />
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: tokens.colors.subtle,
              }}
            >
              Include country code for international calls
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: `${tokens.colors.error}20`,
                border: `1px solid ${tokens.colors.error}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: tokens.colors.error,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.text,
              backgroundColor: tokens.colors.bg,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = tokens.colors.border.default;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.bg;
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isValid}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: tokens.colors.primary,
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving || !isValid ? 'not-allowed' : 'pointer',
              opacity: isSaving || !isValid ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && isValid) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isSaving ? 'Saving...' : 'Save Contact Info'}
          </button>
        </div>
      </div>
    </div>
  );
}
