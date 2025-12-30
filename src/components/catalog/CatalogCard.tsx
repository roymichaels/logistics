import React from 'react';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { colors, spacing } from '../../styles/design-system';

export type CatalogScope = 'platform' | 'infrastructure' | 'business';

interface CatalogCardProps {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  price: number;
  stock_quantity?: number;
  image_url?: string;
  scope: CatalogScope;
  inherited_from?: string;
  is_template?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const scopeColors: Record<CatalogScope, { bg: string; text: string; border: string }> = {
  platform: { bg: '#1E3A8A', text: '#60A5FA', border: '#3B82F6' },
  infrastructure: { bg: '#14532D', text: '#4ADE80', border: '#22C55E' },
  business: { bg: '#7C2D12', text: '#FB923C', border: '#F97316' },
};

export function CatalogCard({
  id,
  name,
  sku,
  description,
  category,
  price,
  stock_quantity,
  image_url,
  scope,
  inherited_from,
  is_template,
  onEdit,
  onDelete,
  onView,
  canEdit = false,
  canDelete = false,
}: CatalogCardProps) {
  const scopeColor = scopeColors[scope];

  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        border: `1px solid ${scopeColor.border}`,
        borderLeft: `4px solid ${scopeColor.border}`,
      }}
    >
      {image_url && (
        <div
          style={{
            width: '100%',
            height: '160px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: colors.background.secondary,
          }}
        >
          <img
            src={image_url}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Badge
          style={{
            background: scopeColor.bg,
            color: scopeColor.text,
            border: `1px solid ${scopeColor.border}`,
          }}
        >
          {scope.charAt(0).toUpperCase() + scope.slice(1)}
        </Badge>
        {is_template && (
          <Badge
            style={{
              background: '#581C87',
              color: '#C084FC',
              border: '1px solid #A855F7',
            }}
          >
            Template
          </Badge>
        )}
        {inherited_from && (
          <Badge
            style={{
              background: '#1E293B',
              color: '#94A3B8',
              border: '1px solid #475569',
            }}
          >
            Inherited
          </Badge>
        )}
        {category && (
          <Badge
            style={{
              background: '#1E293B',
              color: '#94A3B8',
              border: '1px solid #475569',
            }}
          >
            {category}
          </Badge>
        )}
      </div>

      <div>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.text.primary,
            marginBottom: spacing.xs,
          }}
        >
          {name}
        </h3>
        {sku && (
          <p
            style={{
              fontSize: '12px',
              color: colors.text.secondary,
              marginBottom: spacing.xs,
            }}
          >
            SKU: {sku}
          </p>
        )}
        {description && (
          <p
            style={{
              fontSize: '14px',
              color: colors.text.secondary,
              marginTop: spacing.sm,
              lineHeight: '1.5',
            }}
          >
            {description}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.text.primary,
            }}
          >
            ${price.toFixed(2)}
          </div>
          {stock_quantity !== undefined && (
            <div
              style={{
                fontSize: '12px',
                color: stock_quantity > 0 ? '#4ADE80' : '#EF4444',
                marginTop: spacing.xs,
              }}
            >
              {stock_quantity > 0 ? `In Stock: ${stock_quantity}` : 'Out of Stock'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          {onView && (
            <Button
              variant="secondary"
              size="small"
              onClick={onView}
            >
              View
            </Button>
          )}
          {canEdit && onEdit && (
            <Button
              variant="secondary"
              size="small"
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              variant="danger"
              size="small"
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
