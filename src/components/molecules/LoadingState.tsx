import React from 'react';
import { Spinner } from '../atoms/Spinner';
import { Typography } from '../atoms/Typography';
import { colors, spacing } from '../../design-system';

export interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function LoadingState({
  message = 'Loading...',
  fullScreen = false,
  size = 'medium',
}: LoadingStateProps) {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '64px',
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    padding: spacing[8],
    minHeight: fullScreen ? '100vh' : '300px',
  };

  return (
    <div style={containerStyles}>
      <Spinner size={sizeMap[size]} />

      {message && (
        <Typography
          variant="body"
          style={{
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          {message}
        </Typography>
      )}
    </div>
  );
}
