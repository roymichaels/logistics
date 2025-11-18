/**
 * Session Recovery Component
 *
 * Displays when session restoration fails and provides
 * recovery options to the user.
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';
import { sessionManager } from '../lib/sessionManager';
import { sessionHealthMonitor } from '../lib/sessionHealthMonitor';
import { colors } from '../styles/design-system';

interface SessionRecoveryProps {
  onRetry: () => void;
  onSignOut: () => void;
  errorMessage?: string;
}

export function SessionRecovery({ onRetry, onSignOut, errorMessage }: SessionRecoveryProps) {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = () => {
    try {
      const sessionDiag = sessionManager.getDiagnostics();
      const healthDiag = sessionHealthMonitor.getStatus();

      setDiagnostics({
        session: sessionDiag,
        health: healthDiag,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to load diagnostics', error);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      logger.error('Retry failed', error);
    } finally {
      setIsRetrying(false);
      loadDiagnostics();
    }
  };

  const handleClearAndRetry = () => {
    sessionManager.clearSession();
    sessionHealthMonitor.resetStatus();
    handleRetry();
  };

  const theme = colors;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: theme.background,
        direction: 'rtl',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: theme.card,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '20px',
          padding: '32px',
          boxShadow: theme.shadow,
        }}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔄</div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '8px',
              color: theme.text,
            }}
          >
            Session Recovery
          </h1>
          <p style={{ fontSize: '15px', color: theme.muted, lineHeight: '1.5' }}>
            Your session needs to be restored. This usually happens after being offline or after a
            long period of inactivity.
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: theme.error + '20',
              border: `1px solid ${theme.error}`,
              borderRadius: '12px',
              marginBottom: '20px',
              color: theme.errorBright,
              fontSize: '14px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: isRetrying ? theme.mutedDark : theme.gradientPrimary,
              color: theme.white,
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              boxShadow: isRetrying ? 'none' : theme.glowPrimary,
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry Session Restore'}
          </button>

          <button
            onClick={handleClearAndRetry}
            disabled={isRetrying}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: theme.secondary,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
            }}
          >
            Clear & Retry
          </button>

          <button
            onClick={onSignOut}
            disabled={isRetrying}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'transparent',
              color: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
            }}
          >
            Sign Out & Start Fresh
          </button>
        </div>

        {/* Diagnostics */}
        {diagnostics && (
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                color: theme.muted,
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {showDetails ? '▼' : '▶'} Technical Details
            </button>

            {showDetails && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  background: theme.secondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: theme.muted,
                  maxHeight: '300px',
                  overflow: 'auto',
                  direction: 'ltr',
                  textAlign: 'left',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: theme.secondary,
            borderRadius: '12px',
            fontSize: '13px',
            color: theme.muted,
            lineHeight: '1.6',
          }}
        >
          <strong style={{ color: theme.text }}>What happened?</strong>
          <ul style={{ marginTop: '8px', paddingRight: '20px', marginBottom: 0 }}>
            <li>Your session may have expired</li>
            <li>You may have been offline for a while</li>
            <li>Your browser may have cleared storage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
