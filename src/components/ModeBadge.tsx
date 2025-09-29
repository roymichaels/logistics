import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface ModeBadgeProps {
  mode: 'demo' | 'real';
  adapter?: string;
}

export function ModeBadge({ mode, adapter }: ModeBadgeProps) {
  const { theme } = useTelegramUI();
  
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'demo': return '#ff9500';
      case 'real': return '#34c759';
      default: return theme.hint_color;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'demo': return '🎮';
      case 'real': return '🚚';
      default: return '⚙️';
    }
  };

  return (
    <div className="mode-badge" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--tg-spacing-xs)',
      backgroundColor: getModeColor(mode) + '20',
      border: `1px solid ${getModeColor(mode)}40`,
      color: getModeColor(mode)
    }}>
      <span>{getModeIcon(mode)}</span>
      <span>{mode.toUpperCase()}</span>
      {adapter && adapter !== 'mock' && (
        <span style={{ 
          fontSize: '10px', 
          opacity: 0.7,
          marginLeft: 'var(--tg-spacing-xs)'
        }}>
          ({adapter})
        </span>
      )}
    </div>
  );
}