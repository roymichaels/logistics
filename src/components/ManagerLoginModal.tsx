import React, { useState, useCallback } from 'react';
import { Toast } from './Toast';
import { telegram } from '../../lib/telegram';
import { DataStore } from '../../data/types';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface ManagerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userTelegramId: string;
  dataStore: DataStore;
}

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '000000';
const PIN_LENGTH = 6;

export function ManagerLoginModal({
  isOpen,
  onClose,
  onSuccess,
  userTelegramId,
  dataStore
}: ManagerLoginModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme, haptic } = useTelegramUI();

  const handleDigitPress = useCallback((digit: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + digit;
      setPin(newPin);
      haptic();
      setError('');

      if (newPin.length === PIN_LENGTH) {
        setTimeout(() => verifyPin(newPin), 100);
      }
    }
  }, [pin]);

  const handleDelete = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      haptic();
      setError('');
    }
  }, [pin]);

  const verifyPin = async (enteredPin: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    if (enteredPin !== ADMIN_PIN) {
      telegram.hapticFeedback('notification', 'error');
      setError('Incorrect PIN');
      setPin('');
      setIsLoading(false);
      return;
    }

    telegram.hapticFeedback('notification', 'success');

    try {
      if (dataStore.updateProfile) {
        await dataStore.updateProfile({
          role: 'manager'
        });

        onClose();
        onSuccess();
      } else {
        throw new Error('updateProfile method not available');
      }
    } catch (error) {
      console.error('Failed to promote user:', error);
      Toast.error('שגיאה בעדכון הרשאות');
      setPin('');
      setIsLoading(false);
    }
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
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: theme.secondary_bg_color || '#1a1a1a',
          borderRadius: '24px',
          padding: '32px',
          textAlign: 'center',
          color: theme.text_color || '#ffffff'
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '600',
          color: theme.text_color || '#ffffff'
        }}>
          גישת מנהל
        </h2>

        {/* Subtitle */}
        <p style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: theme.hint_color || '#8e8e93'
        }}>
          הזן PIN של 6 ספרות
        </p>

        {/* PIN Display */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <div
              key={index}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: index < pin.length
                  ? (theme.button_color || '#007AFF')
                  : 'rgba(142, 142, 147, 0.3)',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '12px',
            background: 'rgba(255, 59, 48, 0.1)',
            borderRadius: '12px',
            color: '#ff3b30',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {/* Numpad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((digit, index) => {
            if (digit === '') {
              return <div key={index} />;
            }

            if (digit === 'del') {
              return (
                <button
                  key={index}
                  onClick={handleDelete}
                  disabled={isLoading}
                  style={{
                    height: '60px',
                    background: 'rgba(142, 142, 147, 0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    color: theme.text_color || '#ffffff',
                    fontSize: '24px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ⌫
                </button>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleDigitPress(digit)}
                disabled={isLoading}
                style={{
                  height: '60px',
                  background: 'rgba(142, 142, 147, 0.2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: theme.text_color || '#ffffff',
                  fontSize: '24px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {digit}
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            color: theme.button_color || '#007AFF',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
