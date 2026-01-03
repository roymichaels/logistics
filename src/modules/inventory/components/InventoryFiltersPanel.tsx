import React from 'react';
import { tokens } from '../../../styles/tokens';
import type { InventoryFilters } from '../types';

interface InventoryFiltersPanelProps {
  filters: InventoryFilters;
  onFilterChange: (filters: InventoryFilters) => void;
}

export function InventoryFiltersPanel({ filters, onFilterChange }: InventoryFiltersPanelProps) {
  const filterOptions = [
    { value: 'all', label: 'הכל' },
    { value: 'low', label: 'מלאי נמוך' },
    { value: 'out', label: 'אזל מהמלאי' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      overflowX: 'auto',
    }}>
      {filterOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onFilterChange({ ...filters, status: option.value as any })}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            border: filters.status === option.value ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
            background: filters.status === option.value ? tokens.gradients.primary : tokens.colors.bg,
            color: tokens.colors.text,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
