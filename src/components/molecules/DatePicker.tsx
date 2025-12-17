import React, { useState, useRef, useEffect } from 'react';
import { colors, spacing, shadows } from '../../design-system';
import { Button } from '../atoms/Button';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  error,
  label,
  required = false,
  minDate,
  maxDate,
  placeholder = 'Select a date',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

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

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (date1: Date | null, date2: Date): boolean => {
    if (!date1) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const handlePreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(date);
      setIsOpen(false);
    }
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      <div style={{ padding: spacing[2] }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[3],
          }}
        >
          <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
            ‹
          </Button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>
            {viewDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            ›
          </Button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: spacing[1],
            marginBottom: spacing[1],
          }}
        >
          {weekDays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: colors.text.tertiary,
                padding: spacing[1],
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: spacing[1],
          }}
        >
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} />;
            }

            const isDisabled = isDateDisabled(date);
            const isSelected = isSameDay(value, date);
            const isToday = isSameDay(new Date(), date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                disabled={isDisabled}
                style={{
                  padding: spacing[2],
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : isToday
                    ? colors.brand.faded
                    : 'transparent',
                  color: isSelected
                    ? colors.background.primary
                    : isDisabled
                    ? colors.text.tertiary
                    : colors.text.primary,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 150ms ease-in-out',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = colors.background.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = isToday
                      ? colors.brand.faded
                      : 'transparent';
                  }
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: spacing[3],
            paddingTop: spacing[3],
            borderTop: `1px solid ${colors.border.primary}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(new Date());
              setIsOpen(false);
            }}
          >
            Today
          </Button>
        </div>
      </div>
    );
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
          onClick={() => !disabled && setIsOpen(!isOpen)}
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
            color: value ? colors.text.primary : colors.text.tertiary,
            opacity: disabled ? 0.5 : 1,
            transition: 'all 150ms ease-in-out',
          }}
        >
          <span>{value ? formatDate(value) : placeholder}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H4M5 1V3M11 1V3M2 6H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {isOpen && !disabled && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              backgroundColor: colors.background.primary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: '6px',
              boxShadow: shadows.lg,
              zIndex: 1000,
              minWidth: '280px',
            }}
          >
            {renderCalendar()}
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
