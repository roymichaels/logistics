import React, { useState } from 'react';
import { tokens } from '../../theme/tokens';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

export interface FilterOption {
  id: string;
  label: string;
  type: 'dropdown' | 'search' | 'date' | 'status';
  options?: { value: string; label: string }[];
  value?: string;
}

export interface FilterBarProps {
  filters: FilterOption[];
  activeFilters: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  onClearAll?: () => void;
  searchPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  searchPlaceholder = 'Search...',
  className,
  style,
}: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  const renderFilter = (filter: FilterOption) => {
    const value = activeFilters[filter.id] || '';

    switch (filter.type) {
      case 'search':
        return (
          <Input
            key={filter.id}
            type="text"
            placeholder={searchPlaceholder}
            value={value}
            onChange={(e) => onFilterChange(filter.id, e.target.value)}
            style={{ minWidth: '200px' }}
          />
        );

      case 'dropdown':
        return (
          <select
            key={filter.id}
            value={value}
            onChange={(e) => onFilterChange(filter.id, e.target.value)}
            style={{
              padding: '8px 32px 8px 12px',
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.background.primary,
              border: `1px solid ${tokens.colors.neutral[300]}`,
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              minWidth: '150px',
            }}
          >
            <option value="">{filter.label}</option>
            {filter.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            key={filter.id}
            type="date"
            value={value}
            onChange={(e) => onFilterChange(filter.id, e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.background.primary,
              border: `1px solid ${tokens.colors.neutral[300]}`,
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        );

      case 'status':
        return (
          <div key={filter.id} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filter.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFilterChange(filter.id, value === opt.value ? '' : opt.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: value === opt.value ? tokens.colors.primary[700] : tokens.colors.text.secondary,
                  backgroundColor: value === opt.value ? tokens.colors.primary[100] : tokens.colors.background.secondary,
                  border: `1px solid ${value === opt.value ? tokens.colors.primary[300] : tokens.colors.neutral[300]}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={className}
      style={{
        padding: '16px',
        backgroundColor: tokens.colors.background.primary,
        border: `1px solid ${tokens.colors.neutral[200]}`,
        borderRadius: '12px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: collapsed ? '0' : '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.text.primary,
            }}
          >
            Filters
          </h3>
          {activeCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                fontSize: '11px',
                fontWeight: 700,
                color: tokens.colors.background.primary,
                backgroundColor: tokens.colors.primary[600],
                borderRadius: '10px',
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeCount > 0 && onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              color: tokens.colors.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {filters.map(renderFilter)}
        </div>
      )}

      {!collapsed && activeCount > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${tokens.colors.neutral[200]}`,
          }}
        >
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters.find((f) => f.id === key);
            if (!filter) return null;

            const displayValue =
              filter.type === 'dropdown' || filter.type === 'status'
                ? filter.options?.find((opt) => opt.value === value)?.label
                : value;

            return (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px 4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: tokens.colors.text.primary,
                  backgroundColor: tokens.colors.primary[50],
                  border: `1px solid ${tokens.colors.primary[200]}`,
                  borderRadius: '16px',
                }}
              >
                <span style={{ color: tokens.colors.text.secondary }}>{filter.label}:</span>
                <span>{displayValue}</span>
                <button
                  onClick={() => onFilterChange(key, '')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    padding: 0,
                    fontSize: '10px',
                    color: tokens.colors.text.secondary,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                  aria-label={`Remove ${filter.label} filter`}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
