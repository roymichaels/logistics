import React, { useState, useEffect } from 'react';
import { migrationFlags } from '../../../migration/flags';

const shells = [
  { id: 'unified', label: 'Unified Shell', description: 'Single unified shell for all contexts' },
  { id: 'business', label: 'Business Shell', description: 'Business-specific shell' },
  { id: 'driver', label: 'Driver Shell', description: 'Driver-specific shell' },
  { id: 'store', label: 'Store Shell', description: 'Storefront shell' },
];

const STORAGE_KEY = 'dev-console:active-shell';

export function ShellsPanel() {
  const [activeShell, setActiveShell] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && shells.some(s => s.id === stored)) {
      return stored;
    }
    return migrationFlags.unifiedShell ? 'unified' : 'business';
  });

  const handleShellChange = (shellId: string) => {
    setActiveShell(shellId);
    localStorage.setItem(STORAGE_KEY, shellId);

    if (shellId === 'unified') {
      (migrationFlags as any).unifiedShell = true;
      (migrationFlags as any).unifiedApp = true;
    } else {
      (migrationFlags as any).unifiedShell = false;
      (migrationFlags as any).unifiedApp = false;
    }

    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          border: '1px solid rgba(236, 72, 153, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Active Shell
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#ec4899',
            fontFamily: 'monospace',
          }}
        >
          {activeShell}
        </div>
      </div>

      <div
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Shell Override
      </div>

      {shells.map((shell) => {
        const isActive = activeShell === shell.id;
        return (
          <button
            key={shell.id}
            onClick={() => handleShellChange(shell.id)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isActive
                ? 'rgba(236, 72, 153, 0.15)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${isActive ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              }
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              {isActive && (
                <span style={{ fontSize: '12px', color: '#ec4899' }}>●</span>
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: isActive ? '#ec4899' : 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {shell.label}
              </span>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginLeft: isActive ? '20px' : '0',
              }}
            >
              {shell.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
