import React, { useState, useRef, useEffect } from 'react';
import { Toast } from './Toast';
import { telegram } from '../../lib/telegram';
import { DataStore } from '../../data/types';

interface ManagerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userTelegramId: string;
  dataStore: DataStore;
}

const ROYAL_COLORS = {
  card: 'rgba(24, 10, 45, 0.95)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#9c6dff',
  gold: '#f6c945',
  crimson: '#ff6b8a',
  shadow: '0 20px 60px rgba(20, 4, 54, 0.8)'
};

const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 5;
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '000000';

export function ManagerLoginModal({
  isOpen,
  onClose,
  onSuccess,
  userTelegramId,
  dataStore
}: ManagerLoginModalProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockEndTime, setLockEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (locked && lockEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((lockEndTime - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          setLocked(false);
          setAttempts(0);
          setLockEndTime(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [locked, lockEndTime]);

  const handlePinChange = (index: number, value: string) => {
    if (locked) return;

    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(digit => digit !== '') && newPin.length === 6) {
      setTimeout(() => verifyPin(newPin.join('')), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyPin = async (enteredPin: string) => {
    telegram.hapticFeedback('medium');

    if (enteredPin === ADMIN_PIN) {
      telegram.hapticFeedback('notification', 'success');
      Toast.success('PIN אומת בהצלחה! משדרג גישה...');

      try {
        // Update user role in database to 'manager'
        if (dataStore.updateProfile) {
          await dataStore.updateProfile({
            role: 'manager'
          });

          Toast.success('משדרג להרשאות מנהל...');

          // Call success callback and close modal
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 500);
        } else {
          throw new Error('updateProfile method not available');
        }
      } catch (error) {
        console.error('Failed to promote user:', error);
        Toast.error('שגיאה בעדכון הרשאות');
        resetPin();
      }
    } else {
      telegram.hapticFeedback('notification', 'error');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + COOLDOWN_MINUTES * 60 * 1000;
        setLocked(true);
        setLockEndTime(lockTime);
        Toast.error(`נעילה למשך ${COOLDOWN_MINUTES} דקות`);
      } else {
        Toast.error(`PIN שגוי (${newAttempts}/${MAX_ATTEMPTS})`);
      }

      resetPin();
    }
  };

  const resetPin = () => {
    setPin(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        direction: 'rtl'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: ROYAL_COLORS.card,
          border: `2px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: ROYAL_COLORS.shadow
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {locked ? '🔒' : '🔐'}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            marginBottom: '8px'
          }}>
            {locked ? 'מערכת נעולה' : 'גישת מנהל'}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.muted
          }}>
            {locked
              ? `נסה שוב בעוד ${formatTime(timeRemaining)}`
              : 'הזן PIN של 6 ספרות'}
          </p>
        </div>

        {/* PIN Input */}
        {!locked && (
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={locked}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '24px',
                  fontWeight: '700',
                  textAlign: 'center',
                  background: 'rgba(20, 8, 46, 0.6)',
                  border: `2px solid ${digit ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = ROYAL_COLORS.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(156, 109, 255, 0.2)`;
                }}
                onBlur={(e) => {
                  if (!digit) e.target.style.borderColor = ROYAL_COLORS.cardBorder;
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>
        )}

        {/* Attempts Counter */}
        {!locked && attempts > 0 && (
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '12px',
            background: 'rgba(255, 107, 138, 0.15)',
            border: '1px solid rgba(255, 107, 138, 0.3)',
            borderRadius: '12px'
          }}>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: ROYAL_COLORS.crimson,
              fontWeight: '600'
            }}>
              ⚠️ נותרו {MAX_ATTEMPTS - attempts} ניסיונות
            </p>
          </div>
        )}

        {/* Locked Message */}
        {locked && (
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255, 107, 138, 0.15)',
            border: '1px solid rgba(255, 107, 138, 0.3)',
            borderRadius: '12px'
          }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: ROYAL_COLORS.text,
              lineHeight: '1.5'
            }}>
              המערכת נעולה לאחר {MAX_ATTEMPTS} ניסיונות שגויים.
              <br />
              נסה שוב בעוד <strong>{formatTime(timeRemaining)}</strong>
            </p>
          </div>
        )}

        {/* Info Card */}
        <div style={{
          background: 'rgba(77, 208, 225, 0.1)',
          border: '1px solid rgba(77, 208, 225, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '16px' }}>💡</div>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: ROYAL_COLORS.text,
              lineHeight: '1.5'
            }}>
              PIN המנהל משותף בצוות הניהול.
              במידה ואינך יודע את ה-PIN, פנה לבעלים של הפלטפורמה.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              telegram.hapticFeedback('light');
              resetPin();
            }}
            disabled={locked}
            style={{
              flex: 1,
              padding: '14px',
              background: locked ? 'rgba(140, 91, 238, 0.2)' : 'rgba(140, 91, 238, 0.3)',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              color: locked ? ROYAL_COLORS.muted : ROYAL_COLORS.text,
              fontSize: '15px',
              fontWeight: '600',
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.5 : 1
            }}
          >
            נקה
          </button>
          <button
            onClick={() => {
              telegram.hapticFeedback('light');
              onClose();
            }}
            style={{
              flex: 1,
              padding: '14px',
              background: ROYAL_COLORS.accent,
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
