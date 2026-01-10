import React, { useState, useEffect } from 'react';
import { offlineOutboxService } from '../services/offlineOutbox';
import { undergroundTheme } from '../styles/undergroundTheme';
import { logger } from '../lib/logger';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      logger.info('[NetworkStatus] Connection restored');
      setIsOnline(true);
      updatePendingCount();
    };

    const handleOffline = () => {
      logger.warn('[NetworkStatus] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending operations every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await offlineOutboxService.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      logger.error('[NetworkStatus] Failed to get pending count', error);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: undergroundTheme.spacing.xl,
        right: undergroundTheme.spacing.xl,
        zIndex: 1000,
      }}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: undergroundTheme.spacing.sm,
          padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}`,
          background: isOnline
            ? undergroundTheme.colors.glassmorphism.medium
            : `${undergroundTheme.colors.status.error}30`,
          border: `1px solid ${
            isOnline
              ? undergroundTheme.colors.status.success
              : undergroundTheme.colors.status.error
          }`,
          borderRadius: undergroundTheme.borderRadius.full,
          backdropFilter: 'blur(10px)',
          boxShadow: isOnline
            ? undergroundTheme.shadows.glow.green
            : undergroundTheme.shadows.glow.red,
          cursor: 'pointer',
          transition: undergroundTheme.transitions.default,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isOnline
              ? undergroundTheme.colors.status.success
              : undergroundTheme.colors.status.error,
            boxShadow: `0 0 10px ${
              isOnline
                ? undergroundTheme.colors.status.success
                : undergroundTheme.colors.status.error
            }`,
            animation: isOnline ? 'none' : 'pulse 2s infinite',
          }}
        />
        <div
          style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
            color: isOnline
              ? undergroundTheme.colors.status.success
              : undergroundTheme.colors.status.error,
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </div>
        {pendingCount > 0 && (
          <div
            style={{
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
              background: undergroundTheme.colors.status.warning,
              borderRadius: undergroundTheme.borderRadius.full,
              fontSize: undergroundTheme.typography.fontSize.xs,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.surface.primary,
            }}
          >
            {pendingCount} pending
          </div>
        )}
      </div>

      {showDetails && pendingCount > 0 && (
        <div
          style={{
            marginTop: undergroundTheme.spacing.sm,
            padding: undergroundTheme.spacing.md,
            background: undergroundTheme.colors.glassmorphism.dark,
            border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
            borderRadius: undergroundTheme.borderRadius.lg,
            backdropFilter: 'blur(10px)',
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.secondary,
            minWidth: '200px',
          }}
        >
          <div
            style={{
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.xs,
            }}
          >
            Pending Operations
          </div>
          <div>
            {pendingCount} {pendingCount === 1 ? 'operation' : 'operations'} waiting to sync
          </div>
          {isOnline && (
            <div
              style={{
                marginTop: undergroundTheme.spacing.sm,
                color: undergroundTheme.colors.status.success,
                fontSize: undergroundTheme.typography.fontSize.xs,
              }}
            >
              Syncing in progress...
            </div>
          )}
          {!isOnline && (
            <div
              style={{
                marginTop: undergroundTheme.spacing.sm,
                color: undergroundTheme.colors.status.warning,
                fontSize: undergroundTheme.typography.fontSize.xs,
              }}
            >
              Will sync when connection is restored
            </div>
          )}
        </div>
      )}
    </div>
  );
}
