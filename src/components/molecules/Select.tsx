import React, { useState, useRef, useEffect } from 'react';
import { colors, spacing, shadows } from '../../design-system';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  label,
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = Math.min(currentIndex + 1, options.length - 1);
        if (!options[nextIndex].disabled) {
          onChange(options[nextIndex].value);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const prevIndex = Math.max(currentIndex - 1, 0);
      if (!options[prevIndex].disabled) {
        onChange(options[prevIndex].value);
      }
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: spacing[1],
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text.primary,
          }}
        >
          {label}
          {required && <span style={{ color: colors.status.error, marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing[2]} ${spacing[3]}`,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${error ? colors.status.error : colors.border.primary}`,
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            color: selectedOption ? colors.text.primary : colors.text.tertiary,
            opacity: disabled ? 0.5 : 1,
            transition: 'all 150ms ease-in-out',
          }}
        >
          <span>{selectedOption?.label || placeholder}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease-in-out',
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {isOpen && !disabled && (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '240px',
              overflowY: 'auto',
              backgroundColor: colors.background.primary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: '6px',
              boxShadow: shadows.lg,
              zIndex: 1000,
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: '14px',
                  color: option.disabled ? colors.text.tertiary : colors.text.primary,
                  backgroundColor:
                    option.value === value ? colors.brand.faded : 'transparent',
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  opacity: option.disabled ? 0.5 : 1,
                  transition: 'all 150ms ease-in-out',
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled) {
                    e.currentTarget.style.backgroundColor = colors.brand.faded;
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: spacing[1],
            fontSize: '12px',
            color: colors.status.error,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
