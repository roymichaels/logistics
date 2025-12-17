import React, { useState } from 'react';
import { useShellType } from '../../../shells/ShellFactory';

const shells = [
  { id: 'auto', label: 'Auto (Role-Based)', description: 'Automatic shell selection based on user role' },
  { id: 'business', label: 'Business Shell', description: 'For business owners, managers, warehouse' },
  { id: 'driver', label: 'Driver Shell', description: 'For delivery drivers with mobile UI' },
  { id: 'store', label: 'Store Shell', description: 'Customer storefront experience' },
  { id: 'admin', label: 'Admin Shell', description: 'Infrastructure owner platform admin' },
  { id: 'unified', label: 'Unified Shell', description: 'Basic unified shell (legacy)' },
];

const STORAGE_KEY = 'dev-console:shell-override';

export function ShellsPanel() {
  const currentShellType = useShellType();
  const [shellOverride, setShellOverride] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  });

  const handleShellChange = (shellId: string) => {
    if (shellId === 'auto') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, shellId);
    }
    setShellOverride(shellId);
    window.location.reload();
  };

  const displayShell = shellOverride === 'auto' ? currentShellType : shellOverride;

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
          Current Shell
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#ec4899',
            fontFamily: 'monospace',
          }}
        >
          {displayShell}
        </div>
        {shellOverride !== 'auto' && (
          <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '4px' }}>
            OVERRIDE ACTIVE
          </div>
        )}
      </div>

      {shellOverride !== 'auto' && (
        <button
          onClick={() => handleShellChange('auto')}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            color: '#fbbf24',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
          }}
        >
          Clear Override
        </button>
      )}

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
        Available Shells
      </div>

      {shells.map((shell) => {
        const isSelected = shellOverride === shell.id;
        const isCurrent = displayShell === shell.id || (shellOverride === 'auto' && shell.id === currentShellType);
        return (
          <button
            key={shell.id}
            onClick={() => handleShellChange(shell.id)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isSelected
                ? 'rgba(236, 72, 153, 0.15)'
                : isCurrent
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${
                isSelected
                  ? 'rgba(236, 72, 153, 0.3)'
                  : isCurrent
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(255, 255, 255, 0.06)'
              }`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isCurrent) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !isCurrent) {
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
              {isSelected && (
                <span style={{ fontSize: '12px', color: '#ec4899' }}>●</span>
              )}
              {isCurrent && !isSelected && (
                <span style={{ fontSize: '12px', color: '#60a5fa' }}>◉</span>
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: isSelected ? '#ec4899' : isCurrent ? '#60a5fa' : 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {shell.label}
              </span>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginLeft: (isSelected || isCurrent) ? '20px' : '0',
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
