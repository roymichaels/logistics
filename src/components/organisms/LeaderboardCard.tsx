import React from 'react';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export interface LeaderboardEntry {
  id: string;
  name: string;
  value: string | number;
  subtitle?: string;
  avatar?: string;
  rank?: number;
}

export interface LeaderboardCardProps {
  title: string;
  entries: LeaderboardEntry[];
  highlightIndex?: number;
  variant?: 'default' | 'compact';
  onEntryClick?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardCard({
  title,
  entries,
  highlightIndex,
  variant = 'default',
  onEntryClick
}: LeaderboardCardProps) {
  const isCompact = variant === 'compact';

  return (
    <div>
      <h2
        style={{
          margin: `0 0 ${spacing.lg}`,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary
        }}
      >
        {title}
      </h2>

      <div style={{ display: 'grid', gap: spacing.md }}>
        {entries.map((entry, index) => {
          const isHighlighted = highlightIndex !== undefined && index === highlightIndex;
          const isClickable = !!onEntryClick;

          return (
            <div
              key={entry.id}
              style={{
                padding: isCompact ? spacing.md : spacing.lg,
                borderRadius: borderRadius.lg,
                border: `1px solid ${isHighlighted ? colors.brand.primary : colors.border.primary}`,
                backgroundColor: isHighlighted ? colors.brand.faded : colors.ui.card,
                transition: 'all 200ms ease-in-out',
                cursor: isClickable ? 'pointer' : 'default'
              }}
              onClick={() => onEntryClick?.(entry)}
              onMouseEnter={(e) => {
                if (isClickable) {
                  e.currentTarget.style.borderColor = colors.border.hover;
                  e.currentTarget.style.backgroundColor = colors.ui.cardHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isHighlighted
                  ? colors.brand.primary
                  : colors.border.primary;
                e.currentTarget.style.backgroundColor = isHighlighted
                  ? colors.brand.faded
                  : colors.ui.card;
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.md
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                  {entry.rank !== undefined && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isHighlighted ? colors.brand.primary : colors.background.tertiary,
                        color: isHighlighted ? colors.white : colors.text.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold
                      }}
                    >
                      {entry.rank}
                    </div>
                  )}

                  {entry.avatar && (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: colors.background.tertiary
                      }}
                    >
                      <img
                        src={entry.avatar}
                        alt={entry.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: isHighlighted ? typography.fontWeight.bold : typography.fontWeight.medium,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.base
                      }}
                    >
                      {entry.name}
                      {isHighlighted && (
                        <span style={{ color: colors.text.secondary, marginRight: spacing.sm }}>
                          {' '}
                          (את)
                        </span>
                      )}
                    </div>
                    {entry.subtitle && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          marginTop: '2px'
                        }}
                      >
                        {entry.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: isHighlighted ? colors.brand.primary : colors.text.primary
                  }}
                >
                  {entry.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
