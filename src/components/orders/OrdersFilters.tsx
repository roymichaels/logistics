import React from 'react';
import { tokens } from '../../styles/tokens';


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
            border: `2px solid ${filter === option.value ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`,
            borderRadius: '20px',
            background: filter === option.value ? tokens.colors.brand.primary + '20' : 'transparent',
            color: filter === option.value ? tokens.colors.brand.primary : tokens.colors.text,
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
