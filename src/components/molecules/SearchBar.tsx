import React, { useState } from 'react';
import { Input, InputProps } from '../atoms';

export interface SearchBarProps extends Omit<InputProps, 'leftIcon' | 'rightIcon' | 'onChange'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  onClear,
  debounceMs = 300,
  ...inputProps
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (debounceMs > 0) {
      const id = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
      setTimeoutId(id);
    } else {
      onSearch?.(newValue);
    }
  };

  const handleClear = () => {
    setValue('');
    onClear?.();
    onSearch?.('');
  };

  return (
    <Input
      {...inputProps}
      type="search"
      value={value}
      onChange={handleChange}
      leftIcon={<span>🔍</span>}
      rightIcon={
        value ? (
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: '18px',
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null
      }
      fullWidth
    />
  );
}
