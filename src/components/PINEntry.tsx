import React, { useState, useEffect, useCallback } from 'react';

import { PINAuthService, PINValidator } from '../utils/security/pinAuth';
import { logger } from '../lib/logger';

interface PINEntryProps {
  mode: 'setup' | 'verify' | 'change';
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  showForgotPin?: boolean;
}

export function PINEntry({
  mode,
  onSuccess,
  onCancel,
  title,
  subtitle,
  showForgotPin = false
}: PINEntryProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeAnimation, setShakeAnimation] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{ isLocked: boolean; remainingTime?: number }>({ isLocked: false });

  const pinAuthService = new PINAuthService();

  const PIN_LENGTH = 6;

  useEffect(() => {
    checkLockoutStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutInfo.isLocked && lockoutInfo.remainingTime) {
      interval = setInterval(() => {
        const remaining = lockoutInfo.remainingTime! - 1000;
        if (remaining <= 0) {
          setLockoutInfo({ isLocked: false });
        } else {
          setLockoutInfo({ isLocked: true, remainingTime: remaining });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutInfo]);

  const checkLockoutStatus = async () => {
    const lockout = await pinAuthService.getLockoutInfo();
    setLockoutInfo(lockout);
  };

  const getCurrentPin = () => {
    switch (step) {
      case 'current': return currentPin;
      case 'new': return pin;
      case 'confirm': return confirmPin;
      default: return pin;
    }
  };

  const setCurrentPinValue = (value: string) => {
    switch (step) {
      case 'current': setCurrentPin(value); break;
      case 'new': setPin(value); break;
      case 'confirm': setConfirmPin(value); break;
      default: setPin(value); break;
    }
  };

  const handleDigitPress = useCallback((digit: string) => {
    if (lockoutInfo.isLocked) return;

    const currentPinValue = getCurrentPin();
    if (currentPinValue.length < PIN_LENGTH) {
      setCurrentPinValue(currentPinValue + digit);
      haptic();
      setError('');
    }
  }, [getCurrentPin, setCurrentPinValue, lockoutInfo.isLocked]);

  const handleDelete = useCallback(() => {
    if (lockoutInfo.isLocked) return;

    const currentPinValue = getCurrentPin();
    if (currentPinValue.length > 0) {
      setCurrentPinValue(currentPinValue.slice(0, -1));
      haptic();
      setError('');
    }
  }, [getCurrentPin, setCurrentPinValue, lockoutInfo.isLocked]);

  const triggerShakeAnimation = () => {
    setShakeAnimation(true);
    setTimeout(() => setShakeAnimation(false), 500);
  };

  const handlePinComplete = async (completedPin: string) => {
    if (isLoading || lockoutInfo.isLocked) return;

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'setup') {
        if (step === 'new') {
          const validation = PINValidator.validatePINStrength(completedPin);
          if (!validation.isValid) {
            setError(validation.warnings.join(', '));
            triggerShakeAnimation();
            setPin('');
            setIsLoading(false);
            return;
          }
          setStep('confirm');
        } else if (step === 'confirm') {
          if (completedPin === pin) {
            const result = await pinAuthService.setupPIN(pin);
            if (result.success) {
              onSuccess(pin);
            } else {
              setError(result.error || 'Failed to setup PIN');
              triggerShakeAnimation();
              setPin('');
              setConfirmPin('');
              setStep('new');
            }
          } else {
            setError('PINs do not match');
            triggerShakeAnimation();
            setConfirmPin('');
          }
        }
      } else if (mode === 'verify') {
        const result = await pinAuthService.verifyPIN(completedPin);
        if (result.success) {
          onSuccess(completedPin);
        } else {
          setError(result.error || 'Incorrect PIN');
          triggerShakeAnimation();
          setPin('');

          if (result.lockedUntil) {
            checkLockoutStatus();
          }
        }
      } else if (mode === 'change') {
        if (step === 'current') {
          const result = await pinAuthService.verifyPIN(completedPin);
          if (result.success) {
            setStep('new');
          } else {
            setError(result.error || 'Current PIN is incorrect');
            triggerShakeAnimation();
            setCurrentPin('');
          }
        } else if (step === 'new') {
          const validation = PINValidator.validatePINStrength(completedPin);
          if (!validation.isValid) {
            setError(validation.warnings.join(', '));
            triggerShakeAnimation();
            setPin('');
            setIsLoading(false);
            return;
          }
          if (completedPin === currentPin) {
            setError('New PIN must be different from current PIN');
            triggerShakeAnimation();
            setPin('');
            setIsLoading(false);
            return;
          }
          setStep('confirm');
        } else if (step === 'confirm') {
          if (completedPin === pin) {
            const result = await pinAuthService.changePIN(currentPin, pin);
            if (result.success) {
              onSuccess(pin);
            } else {
              setError(result.error || 'Failed to change PIN');
              triggerShakeAnimation();
              setPin('');
              setConfirmPin('');
              setStep('current');
            }
          } else {
            setError('PINs do not match');
            triggerShakeAnimation();
            setConfirmPin('');
          }
        }
      }
    } catch (error) {
      logger.error('PIN handling error:', error);
      setError('An error occurred');
      triggerShakeAnimation();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const currentPinValue = getCurrentPin();
    if (currentPinValue.length === PIN_LENGTH) {
      setTimeout(() => handlePinComplete(currentPinValue), 100);
    }
  }, [getCurrentPin]);

  const getTitle = () => {
    if (title) return title;

    if (mode === 'setup') {
      return step === 'confirm' ? 'Confirm your PIN' : 'Create your PIN';
    } else if (mode === 'change') {
      switch (step) {
        case 'current': return 'Enter current PIN';
        case 'new': return 'Enter new PIN';
        case 'confirm': return 'Confirm new PIN';
        default: return 'Change PIN';
      }
    }
    return 'Enter your PIN';
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;

    if (lockoutInfo.isLocked && lockoutInfo.remainingTime) {
      const minutes = Math.ceil(lockoutInfo.remainingTime / (60 * 1000));
      return `Account locked. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    if (mode === 'setup') {
      return step === 'confirm' ? 'Re-enter your 6-digit PIN' : 'Choose a secure 6-digit PIN';
    } else if (mode === 'change') {
      switch (step) {
        case 'current': return 'Enter your current PIN to continue';
        case 'new': return 'Choose a new secure 6-digit PIN';
        case 'confirm': return 'Re-enter your new PIN';
        default: return '';
      }
    }
    return 'Enter your 6-digit PIN to continue';
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentPinValue = getCurrentPin();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.bg_color,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      direction: 'ltr'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{
          fontSize: '32px',
          marginBottom: '16px'
        }}>
          🔒
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: theme.text_color,
          margin: '0 0 8px 0'
        }}>
          {getTitle()}
        </h1>

        <p style={{
          fontSize: '16px',
          color: lockoutInfo.isLocked ? '#ff3b30' : theme.hint_color,
          margin: 0,
          lineHeight: '1.4'
        }}>
          {getSubtitle()}
        </p>

        {lockoutInfo.isLocked && lockoutInfo.remainingTime && (
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#ff3b30',
            marginTop: '8px'
          }}>
            {formatTime(lockoutInfo.remainingTime)}
          </div>
        )}
      </div>

      {/* PIN Dots */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '40px',
        animation: shakeAnimation ? 'shake 0.5s' : undefined
      }}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <div
            key={index}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: index < currentPinValue.length
                ? (error ? '#ff3b30' : theme.button_color)
                : `${theme.hint_color}30`,
              border: `2px solid ${
                index < currentPinValue.length
                  ? (error ? '#ff3b30' : theme.button_color)
                  : `${theme.hint_color}50`
              }`,
              transition: 'all 0.2s ease',
              transform: index < currentPinValue.length ? 'scale(1.1)' : 'scale(1)'
            }}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#ff3b30',
          fontSize: '14px',
          textAlign: 'center',
          marginBottom: '20px',
          minHeight: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '20px',
        opacity: (lockoutInfo.isLocked || isLoading) ? 0.5 : 1,
        pointerEvents: (lockoutInfo.isLocked || isLoading) ? 'none' : 'auto'
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigitPress(digit.toString())}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '36px',
              backgroundColor: theme.secondary_bg_color,
              border: `1px solid ${theme.hint_color}20`,
              color: theme.text_color,
              fontSize: '24px',
              fontWeight: '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.backgroundColor = `${theme.button_color}20`;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = theme.secondary_bg_color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = theme.secondary_bg_color;
            }}
          >
            {digit}
          </button>
        ))}

        {/* Empty space */}
        <div></div>

        {/* Zero */}
        <button
          onClick={() => handleDigitPress('0')}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '36px',
            backgroundColor: theme.secondary_bg_color,
            border: `1px solid ${theme.hint_color}20`,
            color: theme.text_color,
            fontSize: '24px',
            fontWeight: '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            userSelect: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.backgroundColor = `${theme.button_color}20`;
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = theme.secondary_bg_color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = theme.secondary_bg_color;
          }}
        >
          0
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={currentPinValue.length === 0}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '36px',
            backgroundColor: 'transparent',
            border: 'none',
            color: currentPinValue.length > 0 ? theme.text_color : theme.hint_color,
            fontSize: '20px',
            cursor: currentPinValue.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            userSelect: 'none'
          }}
          onMouseDown={(e) => {
            if (currentPinValue.length > 0) {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.backgroundColor = `${theme.hint_color}20`;
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ⌫
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{
          color: theme.hint_color,
          fontSize: '14px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          Processing...
        </div>
      )}

      {/* Footer Actions */}
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.link_color,
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            Cancel
          </button>
        )}

        {showForgotPin && mode === 'verify' && (
          <button
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.link_color,
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            Forgot PIN?
          </button>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes shake {
          0%, 20%, 40%, 60%, 80%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-8px);
          }
        }
      `}</style>
    </div>
  );
}