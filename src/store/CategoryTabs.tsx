import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}

export function CategoryTabs({ categories, active, onSelect }: CategoryTabsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      overflowX: 'auto',
      padding: '12px',
      borderRadius: '20px',
      backdropFilter: 'blur(14px)',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          style={{
            padding: '10px 14px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: cat === active ? 'linear-gradient(135deg, rgba(108,92,231,0.9), rgba(0,212,255,0.85))' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
