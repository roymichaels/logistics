import React from 'react';

interface UndergroundSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function UndergroundSwitch({ checked, onChange, label, disabled = false }: UndergroundSwitchProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: 'relative',
          width: '48px',
          height: '26px',
          background: checked
            ? 'linear-gradient(135deg, #00d4ff 0%, #00a3cc 100%)'
            : 'rgba(255, 255, 255, 0.1)',
          borderRadius: '13px',
          border: checked ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: checked
            ? '0 0 20px rgba(0, 212, 255, 0.3), inset 0 1px 3px rgba(0, 0, 0, 0.2)'
            : 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '24px' : '2px',
            width: '20px',
            height: '20px',
            background: checked
              ? 'linear-gradient(135deg, #ffffff 0%, #e0f7ff 100%)'
              : 'linear-gradient(135deg, #666666 0%, #444444 100%)',
            borderRadius: '50%',
            boxShadow: checked
              ? '0 2px 8px rgba(0, 212, 255, 0.4), 0 0 12px rgba(0, 212, 255, 0.3)'
              : '0 2px 4px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: checked ? '#00d4ff' : 'rgba(255, 255, 255, 0.7)',
            transition: 'color 0.3s ease',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
