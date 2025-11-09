/**
 * LoadingState Component
 * Consistent loading skeleton for dashboard pages
 */

import React from 'react';
import { colors, spacing, borderRadius } from '../../styles/theme';

export interface LoadingStateProps {
  variant?: 'page' | 'card' | 'minimal';
}

export function LoadingState({ variant = 'page' }: LoadingStateProps) {
  if (variant === 'minimal') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['3xl'],
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid ${colors.border.primary}`,
          borderTop: `4px solid ${colors.brand.primary}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div style={{
        background: colors.ui.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        padding: spacing['2xl'],
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <div style={{
          height: '24px',
          width: '40%',
          background: colors.border.primary,
          borderRadius: borderRadius.md,
          marginBottom: spacing.lg,
        }} />
        <div style={{
          height: '40px',
          width: '60%',
          background: colors.border.primary,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
        }} />
        <div style={{
          height: '16px',
          width: '30%',
          background: colors.border.primary,
          borderRadius: borderRadius.md,
        }} />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      padding: spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xl,
    }}>
      <div style={{
        height: '120px',
        background: colors.ui.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing.lg,
      }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              height: '140px',
              background: colors.ui.card,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.xl,
              animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div style={{
        height: '300px',
        background: colors.ui.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        animation: 'pulse 1.5s ease-in-out infinite 0.4s',
      }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
