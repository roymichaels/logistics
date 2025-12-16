import React from 'react';

import { ROYAL_COLORS } from '../../styles/royalTheme';

interface OrdersFiltersProps {
  filter: string;
  onFilterChange: (filter: string) => void;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'הכל' },
  { value: 'new', label: 'חדש' },
  { value: 'assigned', label: 'הוקצה' },
  { value: 'enroute', label: 'בדרך' },
  { value: 'delivered', label: 'נמסר' }
];

export function OrdersFilters({ filter, onFilterChange }: OrdersFiltersProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => {

            onFilterChange(option.value);
          }}
          style={{
            padding: '10px 20px',
            border: `2px solid ${filter === option.value ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
            borderRadius: '20px',
            background: filter === option.value ? ROYAL_COLORS.accent + '20' : 'transparent',
            color: filter === option.value ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease'
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
