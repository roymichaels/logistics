import React from 'react';

interface OrdersSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function OrdersSearch({ value, onChange, placeholder = 'חיפוש לפי לקוח, טלפון או כתובת...' }: OrdersSearchProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...styles.input,
        marginBottom: '20px',
        fontSize: '15px'
      }}
    />
  );
}
