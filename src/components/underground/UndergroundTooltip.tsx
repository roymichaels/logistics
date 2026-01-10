import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const UndergroundTooltip: React.FC<UndergroundTooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const getTooltipPosition = () => {
    const base = {
      position: 'absolute' as const,
      zIndex: 9999,
      padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
      background: undergroundTheme.colors.background.surface,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
      borderRadius: undergroundTheme.borderRadius.md,
      color: undergroundTheme.colors.text.primary,
      fontSize: undergroundTheme.typography.fontSize.xs,
      whiteSpace: 'nowrap' as const,
      boxShadow: undergroundTheme.shadows.lg,
      backdropFilter: 'blur(20px)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.9)',
      transition: `all ${undergroundTheme.transitions.fast}`,
      pointerEvents: 'none' as const,
    };

    switch (position) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' };
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' };
      default:
        return base;
    }
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div style={getTooltipPosition()}>{content}</div>
    </div>
  );
};
