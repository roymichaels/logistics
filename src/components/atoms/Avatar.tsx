import React from 'react';
import { colors, borderRadius } from '../../styles/design-system';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  fallback?: string;
  online?: boolean;
}

export function Avatar({ src, alt = 'Avatar', size = 40, fallback, online }: AvatarProps) {
  const [error, setError] = React.useState(false);

  const avatarStyles: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: borderRadius.full,
    objectFit: 'cover',
    background: colors.ui.card,
    border: `2px solid ${colors.border.primary}`,
  };

  const fallbackStyles: React.CSSProperties = {
    ...avatarStyles,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.text.primary,
    fontSize: size * 0.4,
    fontWeight: 600,
    textTransform: 'uppercase',
  };

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const statusStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: size * 0.3,
    height: size * 0.3,
    borderRadius: borderRadius.full,
    background: colors.status.success,
    border: `2px solid ${colors.background.primary}`,
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return parts[0]?.slice(0, 2) || '??';
  };

  return (
    <div style={containerStyles}>
      {src && !error ? (
        <img src={src} alt={alt} style={avatarStyles} onError={() => setError(true)} />
      ) : (
        <div style={fallbackStyles}>{fallback ? getInitials(fallback) : '??'}</div>
      )}
      {online && <div style={statusStyles} />}
    </div>
  );
}
