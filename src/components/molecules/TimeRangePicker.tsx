import React from 'react';
import { tokens } from '../../theme/tokens';

export type TimeRange =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

export interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  options?: TimeRangeOption[];
  showCustom?: boolean;
  onCustomClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const defaultOptions: TimeRangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
];

export function TimeRangePicker({
  value,
  onChange,
  options = defaultOptions,
  showCustom = false,
  onCustomClick,
  className,
  style,
}: TimeRangePickerProps) {
  const displayOptions = showCustom ? [...options, { value: 'custom' as TimeRange, label: 'Custom Range' }] : options;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as TimeRange;
    if (newValue === 'custom' && onCustomClick) {
      onCustomClick();
    } else {
      onChange(newValue);
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={className}
      style={{
        padding: '8px 32px 8px 12px',
        fontSize: '14px',
        fontWeight: 500,
        color: tokens.colors.text,
        backgroundColor: tokens.colors.panel,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        transition: 'all 0.2s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.primary[200];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.primary[200];
        e.currentTarget.style.boxShadow = `0 0 0 3px ${tokens.colors.primary[50]}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {displayOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
