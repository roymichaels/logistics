import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';

interface ContentCardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function ContentCard({ children, hoverable, onClick, style, className }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    padding: '24px',
    background: tokens.colors.background.card,
    border: `1px solid ${isHovered && hoverable ? tokens.colors.background.cardBorderHover : tokens.colors.background.cardBorder}`,
    borderRadius: '20px',
    boxShadow: isHovered && hoverable ? tokens.shadows.mdStrong : tokens.shadows.md,
    transition: 'all 0.3s ease',
    cursor: onClick ? 'pointer' : 'default',
    transform: isHovered && hoverable ? 'translateY(-2px)' : 'none',
    ...style
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
