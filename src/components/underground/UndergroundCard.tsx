import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getGlassmorphicStyle } from '../../utils/undergroundStyles';

interface UndergroundCardProps {
  children: ReactNode;
  variant?: 'light' | 'medium' | 'strong';
  hover?: boolean;
  glow?: boolean;
  padding?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function UndergroundCard({
  children,
  variant = 'medium',
  hover = false,
  glow = false,
  padding,
  className,
  onClick,
  style,
}: UndergroundCardProps) {
  const baseStyle: React.CSSProperties = {
    ...getGlassmorphicStyle(variant),
    borderRadius: undergroundTheme.borderRadius.xl,
    padding: padding || undergroundTheme.spacing['2xl'],
    boxShadow: glow ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
    transition: undergroundTheme.transitions.normal,
    ...style,
  };

  const hoverStyle: React.CSSProperties = hover
    ? {
        cursor: 'pointer',
      }
    : {};

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hover) {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.borderHover;
      e.currentTarget.style.boxShadow = undergroundTheme.shadows.lg;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hover) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
      e.currentTarget.style.boxShadow = glow ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md;
    }
  };

  return (
    <div
      className={className}
      style={{ ...baseStyle, ...hoverStyle }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
