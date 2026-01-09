import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getGlassmorphicStyle, getStatusColor } from '../../utils/undergroundStyles';

interface UndergroundTableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => ReactNode;
}

interface UndergroundTableProps {
  columns: UndergroundTableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  striped?: boolean;
  hover?: boolean;
}

export function UndergroundTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'לא נמצאו נתונים',
  onRowClick,
  striped = false,
  hover = true,
}: UndergroundTableProps) {
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    ...getGlassmorphicStyle('light'),
    padding: undergroundTheme.spacing.lg,
    fontSize: undergroundTheme.typography.fontSize.sm,
    fontWeight: undergroundTheme.typography.fontWeight.semibold,
    color: undergroundTheme.colors.text.secondary,
    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };

  const tdStyle: React.CSSProperties = {
    padding: undergroundTheme.spacing.lg,
    fontSize: undergroundTheme.typography.fontSize.md,
    color: undergroundTheme.colors.text.primary,
    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    transition: undergroundTheme.transitions.fast,
  };

  const rowStyle: React.CSSProperties = {
    transition: undergroundTheme.transitions.fast,
    cursor: onRowClick ? 'pointer' : 'default',
  };

  const handleRowMouseEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (hover) {
      e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
      e.currentTarget.style.transform = 'scale(1.01)';
    }
  };

  const handleRowMouseLeave = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (hover) {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  if (loading) {
    return (
      <div style={{
        ...getGlassmorphicStyle('medium'),
        padding: undergroundTheme.spacing['4xl'],
        textAlign: 'center',
        borderRadius: undergroundTheme.borderRadius.xl,
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: undergroundTheme.spacing.lg,
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          ⏳
        </div>
        <p style={{
          color: undergroundTheme.colors.text.secondary,
          fontSize: undergroundTheme.typography.fontSize.md,
        }}>
          טוען נתונים...
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        ...getGlassmorphicStyle('medium'),
        padding: undergroundTheme.spacing['4xl'],
        textAlign: 'center',
        borderRadius: undergroundTheme.borderRadius.xl,
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: undergroundTheme.spacing.lg,
          opacity: 0.5,
        }}>
          📭
        </div>
        <p style={{
          color: undergroundTheme.colors.text.secondary,
          fontSize: undergroundTheme.typography.fontSize.md,
        }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      ...getGlassmorphicStyle('medium'),
      borderRadius: undergroundTheme.borderRadius.xl,
      overflow: 'hidden',
    }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...thStyle,
                  textAlign: column.align || 'right',
                  width: column.width,
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              style={{
                ...rowStyle,
                background: striped && index % 2 === 0 ? undergroundTheme.colors.glassmorphism.light : 'transparent',
              }}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={handleRowMouseEnter}
              onMouseLeave={handleRowMouseLeave}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    ...tdStyle,
                    textAlign: column.align || 'right',
                  }}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
