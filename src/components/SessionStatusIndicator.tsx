/**
 * Session Status Indicator
 *
 * Visual component that shows real-time session health status
 * Useful for debugging authentication issues
 */

import React, { useState, useEffect } from 'react';
import { sessionTracker } from '../lib/sessionTracker';
import { ROYAL_COLORS } from '../styles/royalTheme';

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
    checking: { icon: '⏳', color: ROYAL_COLORS.info, label: 'בודק...' },
    ready: { icon: '✅', color: ROYAL_COLORS.success, label: 'מחובר' },
    warning: { icon: '⚠️', color: ROYAL_COLORS.warning, label: 'חסרים נתונים' },
    error: { icon: '❌', color: ROYAL_COLORS.crimson, label: 'לא מחובר' }
  };

  const config = statusConfig[status];

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '12px',
          background: config.color + '20',
          border: `1px solid ${config.color}40`,
          fontSize: '12px',
          fontWeight: '600',
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
        background: ROYAL_COLORS.cardBg,
        border: `2px solid ${config.color}`,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
              fontSize: '14px',
              fontWeight: '600',
              color: ROYAL_COLORS.text
            }}>
              {config.label}
            </div>
            {status === 'warning' && (
              <div style={{
                fontSize: '11px',
                color: ROYAL_COLORS.muted,
                marginTop: '2px'
              }}>
                חסרים JWT claims
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          color: ROYAL_COLORS.muted,
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
            borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`,
            fontSize: '12px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontWeight: '600',
              color: ROYAL_COLORS.text,
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
                fontWeight: '600',
                color: ROYAL_COLORS.text,
                marginBottom: '8px'
              }}>
                JWT Claims:
              </div>
              <div style={{
                background: ROYAL_COLORS.secondary,
                padding: '8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: ROYAL_COLORS.muted,
                wordBreak: 'break-all'
              }}>
                {Object.entries(details.claims).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <span style={{ color: ROYAL_COLORS.accent }}>{key}:</span>{' '}
                    <span>{String(value) || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.errors && details.errors.length > 0 && (
            <div>
              <div style={{
                fontWeight: '600',
                color: ROYAL_COLORS.crimson,
                marginBottom: '8px'
              }}>
                שגיאות:
              </div>
              <div style={{
                background: ROYAL_COLORS.crimson + '20',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '11px',
                color: ROYAL_COLORS.crimson
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
              background: ROYAL_COLORS.info,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
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
      background: ROYAL_COLORS.secondary,
      borderRadius: '6px'
    }}>
      <span style={{ color: ROYAL_COLORS.muted }}>{label}</span>
      <span style={{
        fontSize: '16px'
      }}>
        {value ? '✅' : '❌'}
      </span>
    </div>
  );
}
