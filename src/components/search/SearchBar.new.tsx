import React from 'react';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  autoFocus?: boolean;
};

export default function SearchBarNew({ query, onQueryChange, autoFocus }: Props) {
  const [local, setLocal] = React.useState(query || '');
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setLocal(query || '');
  }, [query]);

  const handleChange = (value: string) => {
    setLocal(value);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      onQueryChange(value);
    }, 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-panel)'
      }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>🔍</span>
      <input
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="חיפוש מוצרים"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--color-text)'
        }}
      />
      {local && (
        <button
          onClick={() => handleChange('')}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
