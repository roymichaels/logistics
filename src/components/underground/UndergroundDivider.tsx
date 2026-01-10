import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundDividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: keyof typeof undergroundTheme.spacing;
  text?: string;
}

export const UndergroundDivider: React.FC<UndergroundDividerProps> = ({
  orientation = 'horizontal',
  spacing = 'md',
  text,
}) => {
  if (orientation === 'vertical') {
    const verticalStyle: React.CSSProperties = {
      width: '1px',
      height: '100%',
      background: `linear-gradient(to bottom, transparent, ${undergroundTheme.colors.glassmorphism.border}, transparent)`,
      margin: `0 ${undergroundTheme.spacing[spacing]}`,
    };

    return <div style={verticalStyle} />;
  }

  if (text) {
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: undergroundTheme.spacing.md,
      margin: `${undergroundTheme.spacing[spacing]} 0`,
    };

    const lineStyle: React.CSSProperties = {
      flex: 1,
      height: '1px',
      background: `linear-gradient(to right, transparent, ${undergroundTheme.colors.glassmorphism.border}, transparent)`,
    };

    const textStyle: React.CSSProperties = {
      color: undergroundTheme.colors.text.tertiary,
      fontSize: undergroundTheme.typography.fontSize.sm,
      fontWeight: undergroundTheme.typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    };

    return (
      <div style={containerStyle}>
        <div style={lineStyle} />
        <span style={textStyle}>{text}</span>
        <div style={lineStyle} />
      </div>
    );
  }

  const horizontalStyle: React.CSSProperties = {
    height: '1px',
    width: '100%',
    background: `linear-gradient(to right, transparent, ${undergroundTheme.colors.glassmorphism.border}, transparent)`,
    margin: `${undergroundTheme.spacing[spacing]} 0`,
  };

  return <div style={horizontalStyle} />;
};
