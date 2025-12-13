import React, { useEffect, useState } from 'react';
import { migrationFlags } from '../../../migration/flags';

const STORAGE_KEY = 'migration-flags';

type FlagKey = keyof typeof migrationFlags;

function loadFlags(): typeof migrationFlags {
  if (typeof window === 'undefined') return { ...migrationFlags };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...migrationFlags };
    return { ...migrationFlags, ...JSON.parse(raw) };
  } catch {
    return { ...migrationFlags };
  }
}

function saveFlags(flags: typeof migrationFlags) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

export function FlagsPanel() {
  const [flags, setFlags] = useState(loadFlags);

  useEffect(() => {
    saveFlags(flags);
  }, [flags]);

  const toggle = (key: FlagKey) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setFlags({ ...migrationFlags });
  };

  const flagEntries = Object.entries(flags) as [FlagKey, boolean][];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {flagEntries.map(([key, value]) => (
        <label
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '42px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: value
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${value ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'}`,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={() => toggle(key)}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: value ? '20px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: value ? '#22c55e' : 'rgba(255, 255, 255, 0.6)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          </div>
          <span
            style={{
              flex: 1,
              fontSize: '13px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
              fontFamily: 'monospace',
            }}
          >
            {key}
          </span>
        </label>
      ))}

      <button
        onClick={resetAll}
        style={{
          marginTop: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }}
      >
        Reset All Flags
      </button>
    </div>
  );
}
