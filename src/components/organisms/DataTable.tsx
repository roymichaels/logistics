import React, { useState } from 'react';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';
import { Button, Text } from '../atoms';
import { Card } from '../molecules';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  sortBy,
  sortDirection = 'asc',
  onSort,
}: DataTableProps<T>) {
  const [localSortBy, setLocalSortBy] = useState<string | undefined>(sortBy);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(sortDirection);

  const handleSort = (key: string) => {
    const newDirection =
      localSortBy === key && localSortDirection === 'asc' ? 'desc' : 'asc';
    setLocalSortBy(key);
    setLocalSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: typography.fontSize.sm,
  };

  const thStyles: React.CSSProperties = {
    padding: spacing.lg,
    textAlign: 'left',
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    borderBottom: `2px solid ${colors.border.primary}`,
    background: colors.background.secondary,
    whiteSpace: 'nowrap',
  };

  const tdStyles: React.CSSProperties = {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
    color: colors.text.primary,
  };

  const rowStyles: React.CSSProperties = {
    cursor: onRowClick ? 'pointer' : 'default',
    transition: '0.2s ease',
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: spacing['4xl'] }}>
          <Text color="secondary">Loading...</Text>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: spacing['4xl'] }}>
          <Text color="secondary">{emptyMessage}</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyles}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    ...thStyles,
                    width: column.width,
                    cursor: column.sortable ? 'pointer' : 'default',
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    {column.label}
                    {column.sortable && localSortBy === column.key && (
                      <span>{localSortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                style={rowStyles}
                onClick={() => onRowClick?.(item)}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.background = colors.ui.cardHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {columns.map((column) => (
                  <td key={column.key} style={tdStyles}>
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
