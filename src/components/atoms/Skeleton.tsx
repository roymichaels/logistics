import React from 'react';
import { colors, borderRadius, spacing } from '../../styles/design-system';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  width = '100%',
  height = '16px',
  variant = 'text',
  animation = 'wave',
}: SkeletonProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      borderRadius: borderRadius.sm,
      height,
    },
    circular: {
      borderRadius: borderRadius.full,
      width: height,
    },
    rectangular: {
      borderRadius: borderRadius.md,
    },
  };

  const animationStyles: Record<string, React.CSSProperties> = {
    pulse: {
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
    },
    wave: {
      backgroundImage: `linear-gradient(90deg, ${colors.background.secondary} 0%, ${colors.background.tertiary} 50%, ${colors.background.secondary} 100%)`,
      backgroundSize: '200% 100%',
      animation: 'skeletonShimmer 1.5s ease-in-out infinite',
    },
    none: {},
  };

  const skeletonStyles: React.CSSProperties = {
    display: 'inline-block',
    width,
    height,
    backgroundColor: colors.background.secondary,
    ...variantStyles[variant],
    ...animationStyles[animation],
  };

  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        @keyframes skeletonShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      <div style={skeletonStyles} />
    </>
  );
}

export interface SkeletonGroupProps {
  count?: number;
  spacing?: keyof typeof spacing;
  children: React.ReactNode;
}

export function SkeletonGroup({ count = 1, spacing: spacingKey = 'md', children }: SkeletonGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[spacingKey] }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  );
}
