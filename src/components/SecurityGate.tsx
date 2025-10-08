/**
 * Security Gate Component
 * Handles PIN authentication and security flow for the entire application
 */

import React, { useState, useEffect } from 'react';
import { PINEntry } from './PINEntry';
import { SecurityManager, AuthenticationState, initializeGlobalSecurityManager } from '../utils/security/securityManager';
import { SecurityAuditLogger } from '../utils/security/auditLogger';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew } from '../lib/hebrew';

interface SecurityGateProps {
  userId: string;
  telegramId: string;
  children: React.ReactNode;
  onSecurityError?: (error: string) => void;
}

export function SecurityGate({
  userId,
  telegramId,
  children,
  onSecurityError
}: SecurityGateProps) {
  const [securityManager, setSecurityManager] = useState<SecurityManager | null>(null);
  const [authState, setAuthState] = useState<AuthenticationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify' | 'change'>('verify');
  const [showChangePinPrompt, setShowChangePinPrompt] = useState(false);

  const { theme, haptic } = useTelegramUI();
  const auditLogger = new SecurityAuditLogger();

  useEffect(() => {
    initializeSecurity();
  }, [userId, telegramId]);

  const initializeSecurity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize security manager
      const manager = initializeGlobalSecurityManager({
        userId,
        telegramId,
        requirePinForAccess: true,
        sessionTimeoutHours: 24,
        requirePinChange: false,
        pinChangeIntervalDays: 90
      });

      await manager.initialize();
      setSecurityManager(manager);

      // Check authentication state
      const state = manager.getAuthenticationState();
      setAuthState(state);

      if (state.requiresPinSetup) {
        setPinMode('setup');
        setShowPinEntry(true);
      } else if (!state.isAuthenticated && !state.lockoutActive) {
        setPinMode('verify');
        setShowPinEntry(true);
      } else if (state.lockoutActive) {
        setShowPinEntry(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Security initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Security initialization failed';
      setError(errorMessage);
      onSecurityError?.(errorMessage);
      setLoading(false);
    }
  };

  const handlePinSetup = async (pin: string) => {
    if (!securityManager) return;

    try {
      const result = await securityManager.setupPIN(pin);

      // Log PIN setup attempt
      await auditLogger.logSecurityEvent({
        eventType: 'pin_setup',
        userId: telegramId,
        details: {
          timestamp: new Date().toISOString(),
          setupMode: 'first_time'
        },
        success: result.success,
        riskLevel: 'medium'
      });

      if (result.success) {
        console.log('\u2705 PIN setup successful - logged to audit');
        haptic();
        setShowPinEntry(false);
        setAuthState(securityManager.getAuthenticationState());
      } else {
        setError(result.error || 'PIN setup failed');
      }
    } catch (error) {
      console.error('PIN setup error:', error);
      setError('PIN setup failed');
    }
  };

  const handlePinVerification = async (pin: string) => {
    if (!securityManager) return;

    try {
      const result = await securityManager.authenticateWithPIN(pin);

      // Log PIN verification attempt
      await auditLogger.logPINAttempt(
        telegramId,
        result.success,
        result.failureCount || 0
      );

      if (result.success) {
        console.log('\u2705 PIN verified successfully - logged to audit');
        haptic();
        setShowPinEntry(false);
        setAuthState(securityManager.getAuthenticationState());

        if (result.requiresPinChange) {
          setShowChangePinPrompt(true);
        }
      } else {
        console.log('\u274c PIN verification failed - logged to audit');
        setError(result.error || 'Authentication failed');
        // Refresh auth state to get updated lockout info
        setAuthState(securityManager.getAuthenticationState());
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Authentication failed');
    }
  };

  const handlePinChange = async (pin: string) => {
    // This would be called for PIN change flow
    // Implementation would depend on having both current and new PIN
    console.log('PIN change requested');
  };

  const handlePinCancel = () => {
    if (pinMode === 'setup') {
      // Can't cancel setup, it's required
      return;
    }

    setShowPinEntry(false);
    // Could navigate to a limited access mode or logout
  };

  const handleEmergencyReset = async () => {
    if (!securityManager) return;

    try {
      await securityManager.emergencyReset();
      setAuthState(null);
      setPinMode('setup');
      setShowPinEntry(true);
      setError(null);
    } catch (error) {
      console.error('Emergency reset failed:', error);
      setError('Reset failed');
    }
  };

  const handleShowChangePin = () => {
    setPinMode('change');
    setShowPinEntry(true);
    setShowChangePinPrompt(false);
  };

  const handleDismissChangePinPrompt = () => {
    setShowChangePinPrompt(false);
  };

  if (loading) {
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
        gap: '20px'
      }}>
        <div style={{
          fontSize: '40px',
          marginBottom: '16px'
        }}>
          🔐
        </div>
        <div style={{
          color: theme.text_color,
          fontSize: '18px',
          fontWeight: '600'
        }}>
          מאתחל אבטחה...
        </div>
        <div style={{
          color: theme.hint_color,
          fontSize: '14px'
        }}>
          טוען מערכת הצפנה מתקדמת
        </div>
      </div>
    );
  }

  if (error) {
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
        gap: '20px',
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{
          fontSize: '40px',
          marginBottom: '16px'
        }}>
          ⚠️
        </div>
        <div style={{
          color: '#ff3b30',
          fontSize: '18px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          שגיאת אבטחה
        </div>
        <div style={{
          color: theme.hint_color,
          fontSize: '14px',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {error}
        </div>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '20px'
        }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 20px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            נסה שוב
          </button>
          <button
            onClick={handleEmergencyReset}
            style={{
              padding: '12px 20px',
              backgroundColor: '#ff3b30',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            איפוס חירום
          </button>
        </div>
      </div>
    );
  }

  // Show PIN entry if needed
  if (showPinEntry && authState) {
    const getTitle = () => {
      switch (pinMode) {
        case 'setup':
          return 'יצירת קוד אבטחה';
        case 'change':
          return 'שינוי קוד אבטחה';
        default:
          return 'הכנס קוד אבטחה';
      }
    };

    const getSubtitle = () => {
      if (authState.lockoutActive && authState.lockoutRemaining) {
        const minutes = Math.ceil(authState.lockoutRemaining / (60 * 1000));
        return `החשבון נעול. נסה שוב בעוד ${minutes} דקות`;
      }

      switch (pinMode) {
        case 'setup':
          return 'בחר קוד בן 6 ספרות לאבטחת המערכת';
        case 'change':
          return 'הכנס קוד אבטחה חדש';
        default:
          return 'הכנס את קוד האבטחה שלך כדי להמשיך';
      }
    };

    return (
      <PINEntry
        mode={pinMode}
        title={getTitle()}
        subtitle={getSubtitle()}
        onSuccess={(pin) => {
          switch (pinMode) {
            case 'setup':
              handlePinSetup(pin);
              break;
            case 'change':
              handlePinChange(pin);
              break;
            default:
              handlePinVerification(pin);
              break;
          }
        }}
        onCancel={pinMode !== 'setup' ? handlePinCancel : undefined}
        showForgotPin={pinMode === 'verify'}
      />
    );
  }

  // Show PIN change prompt if needed
  if (showChangePinPrompt) {
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
        gap: '20px',
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{
          fontSize: '40px',
          marginBottom: '16px'
        }}>
          🔄
        </div>
        <div style={{
          color: theme.text_color,
          fontSize: '18px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          שינוי קוד אבטחה נדרש
        </div>
        <div style={{
          color: theme.hint_color,
          fontSize: '14px',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          מומלץ לשנות את קוד האבטחה שלך מעת לעת לשמירה על אבטחה מרבית
        </div>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '20px'
        }}>
          <button
            onClick={handleShowChangePin}
            style={{
              padding: '12px 20px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            שנה קוד
          </button>
          <button
            onClick={handleDismissChangePinPrompt}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: theme.hint_color,
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            דחה לאחר מכן
          </button>
        </div>
      </div>
    );
  }

  // If authenticated, show the app
  if (authState?.isAuthenticated) {
    return <>{children}</>;
  }

  // Default: show loading or authentication required message
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
      gap: '20px',
      padding: '20px',
      direction: 'rtl'
    }}>
      <div style={{
        fontSize: '40px',
        marginBottom: '16px'
      }}>
        🔐
      </div>
      <div style={{
        color: theme.text_color,
        fontSize: '18px',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        אימות נדרש
      </div>
      <div style={{
        color: theme.hint_color,
        fontSize: '14px',
        textAlign: 'center',
        lineHeight: '1.4'
      }}>
        אנא הכנס את קוד האבטחה שלך
      </div>
      <button
        onClick={() => {
          setPinMode('verify');
          setShowPinEntry(true);
        }}
        style={{
          padding: '12px 24px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        הכנס קוד אבטחה
      </button>
    </div>
  );
}