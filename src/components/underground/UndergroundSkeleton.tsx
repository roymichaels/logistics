import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const UndergroundSkeleton: React.FC<UndergroundSkeletonProps> = ({
  width = '100%',
  height = '20px',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const getBorderRadius = () => {
    switch (variant) {
      case 'circular':
        return undergroundTheme.borderRadius.full;
      case 'text':
        return undergroundTheme.borderRadius.sm;
      case 'rectangular':
      default:
        return undergroundTheme.borderRadius.md;
    }
  };

  const getSize = () => {
    if (variant === 'circular') {
      const size = width || height || '40px';
      return { width: size, height: size };
    }
    return { width, height };
  };

  const baseStyle: React.CSSProperties = {
    ...getSize(),
    background: `linear-gradient(90deg, ${undergroundTheme.colors.background.dark} 25%, ${undergroundTheme.colors.background.medium} 50%, ${undergroundTheme.colors.background.dark} 75%)`,
    backgroundSize: '200% 100%',
    borderRadius: getBorderRadius(),
    animation: animation === 'pulse' ? 'skeleton-pulse 1.5s ease-in-out infinite' : animation === 'wave' ? 'skeleton-wave 1.5s linear infinite' : 'none',
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes skeleton-wave {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={baseStyle} />
    </>
  );
};
