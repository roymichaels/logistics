import React, { useEffect, useState } from 'react';
import { Drawer } from '../components/primitives/Drawer';
import { migrationFlags } from './flags';

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

export function DevMigrationPanel() {
  if (process.env.NODE_ENV !== 'development') return null;

  const [flags, setFlags] = useState(loadFlags);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    saveFlags(flags);
  }, [flags]);

  const toggle = (key: FlagKey) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 11000,
          padding: '10px 12px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-panel)',
          color: 'var(--color-text)',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer'
        }}
      >
        Migration
      </button>

      <Drawer isOpen={open} onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--color-text)' }}>
          <h3 style={{ margin: 0 }}>Migration Flags</h3>
          {(Object.keys(flags) as FlagKey[]).map((key) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={() => toggle(key)}
              />
              <span>{key}</span>
            </label>
          ))}
          <button
            onClick={() => {
              setFlags({ ...migrationFlags });
            }}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
      </Drawer>
    </>
  );
}
