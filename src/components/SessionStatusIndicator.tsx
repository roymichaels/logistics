/**
 * Session Status Indicator
 *
 * Visual component that shows real-time session health status
 * Useful for debugging authentication issues
 */

import React, { useState, useEffect } from 'react';
import { sessionTracker } from '../lib/sessionTracker';
import { tokens } from '../styles/tokens';
import { logger } from '../lib/logger';

interface SessionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function SessionStatusIndicator({ showDetails = false, compact = false }: SessionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error' | 'warning'>('checking');
  const [details, setDetails] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const verification = await sessionTracker.verifySession();

    if (verification.valid) {
      setStatus('ready');
    } else if (verification.hasSession && !verification.hasClaims) {
      setStatus('warning');
    } else {
      setStatus('error');
    }

    setDetails(verification);
  };

  const statusConfig = {
    checking: { icon: '⏳', color: tokens.colors.status.info, label: 'בודק...' },
    ready: { icon: '✅', color: tokens.colors.status.success, label: 'מחובר' },
    warning: { icon: '⚠️', color: tokens.colors.status.warning, label: 'חסרים נתונים' },
    error: { icon: '❌', color: tokens.colors.status.error, label: 'לא מחובר' }
  };

  const config = statusConfig[status];

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: tokens.spacing.xs,
          padding: '4px 10px',
          borderRadius: tokens.radius.md,
          background: config.color + '20',
          border: `1px solid ${config.color}40`,
          fontSize: tokens.typography.fontSize.xs,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: config.color
        }}
      >
        <span style={{ fontSize: '14px' }}>{config.icon}</span>
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        right: '16px',
        background: tokens.colors.background.card,
        border: `2px solid ${config.color}`,
        borderRadius: tokens.radius.md,
        boxShadow: tokens.shadows.lg,
        zIndex: 9998,
        maxWidth: expanded ? '500px' : '200px',
        transition: 'all 0.3s ease',
        margin: '0 auto'
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{config.icon}</span>
          <div>
            <div style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary
            }}>
              {config.label}
            </div>
            {status === 'warning' && (
              <div style={{
                fontSize: '11px',
                color: tokens.colors.text.secondary,
                marginTop: '2px'
              }}>
                חסרים JWT claims
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: tokens.typography.fontSize.xs,
          color: tokens.colors.text.secondary,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </span>
      </div>

      {expanded && showDetails && details && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${tokens.colors.border.default}`,
            fontSize: tokens.typography.fontSize.xs,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
              marginBottom: '8px'
            }}>
              סטטוס Session:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <StatusLine
                label="Session קיים"
                value={details.hasSession}
              />
              <StatusLine
                label="Claims קיימים"
                value={details.hasClaims}
              />
              <StatusLine
                label="Session תקין"
                value={details.valid}
              />
            </div>
          </div>

          {details.claims && Object.keys(details.claims).length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                marginBottom: '8px'
              }}>
                JWT Claims:
              </div>
              <div style={{
                background: tokens.colors.background.secondary,
                padding: '8px',
                borderRadius: tokens.radius.xs,
                fontSize: '11px',
                fontFamily: 'monospace',
                color: tokens.colors.text.secondary,
                wordBreak: 'break-all'
              }}>
                {Object.entries(details.claims).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <span style={{ color: tokens.colors.brand.primary }}>{key}:</span>{' '}
                    <span>{String(value) || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.errors && details.errors.length > 0 && (
            <div>
              <div style={{
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.status.error,
                marginBottom: '8px'
              }}>
                שגיאות:
              </div>
              <div style={{
                background: tokens.colors.status.error + '20',
                padding: '8px',
                borderRadius: tokens.radius.xs,
                fontSize: '11px',
                color: tokens.colors.status.error
              }}>
                {details.errors.map((err: string, i: number) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              logger.info('=== SESSION TRACKER REPORT ===');
              logger.info(sessionTracker.getReport());
              alert('Report printed to console');
            }}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '8px',
              background: tokens.colors.status.info,
              color: tokens.colors.text.bright,
              border: 'none',
              borderRadius: tokens.radius.xs,
              fontSize: tokens.typography.fontSize.xs,
              fontWeight: tokens.typography.fontWeight.semibold,
              cursor: 'pointer'
            }}
          >
            📋 הדפס דו"ח מלא
          </button>
        </div>
      )}
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 8px',
      background: tokens.colors.background.secondary,
      borderRadius: tokens.radius.xs
    }}>
      <span style={{ color: tokens.colors.text.secondary }}>{label}</span>
      <span style={{
        fontSize: tokens.typography.fontSize.base
      }}>
        {value ? '✅' : '❌'}
      </span>
    </div>
  );
}
