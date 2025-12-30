import React from 'react';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { colors, spacing } from '../../styles/design-system';
import { ROLE_PERMISSIONS } from '../../lib/rolePermissions';
import type { User } from '../../data/types';

interface RoleComparisonCardProps {
  role: User['role'];
  onSelect?: () => void;
  onEdit?: () => void;
  selected?: boolean;
  showDetails?: boolean;
}

const levelColors = {
  platform: { bg: '#1E3A8A', text: '#60A5FA' },
  infrastructure: { bg: '#14532D', text: '#4ADE80' },
  business: { bg: '#7C2D12', text: '#FB923C' },
};

export function RoleComparisonCard({
  role,
  onSelect,
  onEdit,
  selected = false,
  showDetails = true,
}: RoleComparisonCardProps) {
  const roleInfo = ROLE_PERMISSIONS[role];

  if (!roleInfo) return null;

  const levelColor = levelColors[roleInfo.level];

  return (
    <Card
      style={{
        border: selected ? `2px solid ${levelColor.text}` : `1px solid ${colors.border.primary}`,
        background: selected ? `${levelColor.bg}15` : colors.background.secondary,
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text.primary,
                marginBottom: spacing.xs,
              }}
            >
              {roleInfo.label}
            </h3>
            <Badge
              style={{
                background: levelColor.bg,
                color: levelColor.text,
                border: `1px solid ${levelColor.text}`,
              }}
            >
              {roleInfo.level} level
            </Badge>
          </div>
          {onEdit && (
            <Button variant="secondary" size="small" onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}>
              Edit
            </Button>
          )}
        </div>

        {showDetails && (
          <>
            <p
              style={{
                fontSize: '14px',
                color: colors.text.secondary,
                lineHeight: '1.5',
              }}
            >
              {roleInfo.description}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: spacing.sm,
                padding: spacing.md,
                background: colors.background.primary,
                borderRadius: '8px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Total Permissions
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: colors.text.primary,
                  }}
                >
                  {roleInfo.permissions.length}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Financial Access
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: roleInfo.canSeeFinancials ? '#10B981' : '#EF4444',
                  }}
                >
                  {roleInfo.canSeeFinancials ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Cross-Business
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: roleInfo.canSeeCrossBusinessData ? '#10B981' : '#EF4444',
                  }}
                >
                  {roleInfo.canSeeCrossBusinessData ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Scope
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text.primary,
                    textTransform: 'capitalize',
                  }}
                >
                  {roleInfo.level}
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.text.secondary,
                  marginBottom: spacing.sm,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Permission Categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                {Array.from(
                  new Set(roleInfo.permissions.map(p => p.split(':')[0]))
                ).map(category => (
                  <Badge
                    key={category}
                    style={{
                      background: colors.background.tertiary,
                      color: colors.text.primary,
                      border: `1px solid ${colors.border.primary}`,
                      fontSize: '11px',
                    }}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
