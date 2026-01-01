import React from 'react';
import { Tooltip } from './Tooltip';
import { tokens } from '../../theme/tokens';

export type IndicatorStatus = 'online' | 'offline' | 'busy' | 'away' | 'idle';

export interface StatusIndicatorProps {
  status: IndicatorStatus;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  pulsing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const statusColors: Record<IndicatorStatus, string> = {
  online: tokens.colors.semantic.success,
  offline: tokens.colors.neutral[400],
  busy: tokens.colors.semantic.error,
  away: tokens.colors.semantic.warning,
  idle: tokens.colors.neutral[500],
};

const sizeMap = {
  sm: 8,
  md: 10,
  lg: 12,
};

export function StatusIndicator({
  status,
  label,
  showLabel = false,
  size = 'md',
  tooltip,
  pulsing = false,
  className,
  style,
}: StatusIndicatorProps) {
  const color = statusColors[status];
  const dotSize = sizeMap[size];

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  const indicator = (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
      aria-label={tooltip || `Status: ${status}`}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: color,
            border: `2px solid ${tokens.colors.background.primary}`,
          }}
        />
        {pulsing && status === 'online' && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: color,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.75,
            }}
          />
        )}
      </span>
      {showLabel && (
        <span
          style={{
            fontSize: size === 'sm' ? '12px' : size === 'md' ? '13px' : '14px',
            color: tokens.colors.text.primary,
            fontWeight: 500,
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{indicator}</Tooltip>;
  }

  return indicator;
}
