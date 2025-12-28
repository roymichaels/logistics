import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../../context/AppServicesContext';
import { shellEngine, ShellType, ShellConfig } from '../../../foundation/engine/ShellEngine';
import { logger } from '../../../lib/logger';

export function ShellsPanel() {
  const { userRole } = useAppServices();
  const [shellConfig, setShellConfig] = useState<ShellConfig>(() => shellEngine.getCurrentShell());
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    const unsubscribe = shellEngine.subscribe((config) => {
      setShellConfig(config);
      setUpdateCount(prev => prev + 1);
    });

    return () => unsubscribe();
  }, []);

  const handleShellSwitch = (type: ShellType) => {
    logger.info(`[DevPanel] Manually switching to ${type} shell`);
    shellEngine.switchShell(type);
  };

  const handleFeatureToggle = (feature: keyof ShellConfig['features']) => {
    const newValue = !shellConfig.features[feature];
    logger.info(`[DevPanel] Toggling ${feature} to ${newValue}`);
    shellEngine.updateFeatures({ [feature]: newValue });
  };

  const shellTypes: { type: ShellType; label: string; icon: string; description: string }[] = [
    { type: 'unified', label: 'Unified Shell', icon: '🌐', description: 'Admin & Infrastructure roles' },
    { type: 'business', label: 'Business Shell', icon: '🏢', description: 'Business operations roles' },
    { type: 'driver', label: 'Driver Shell', icon: '🚚', description: 'Delivery driver role' },
    { type: 'store', label: 'Store Shell', icon: '🛒', description: 'Customer storefront' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Current Shell Status */}
      <div
        style={{
          padding: '14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa' }}>
            Current Shell
          </div>
          <div
            style={{
              fontSize: '10px',
              padding: '3px 7px',
              borderRadius: '5px',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              fontFamily: 'monospace',
            }}
          >
            {updateCount} updates
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '20px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            {shellTypes.find(s => s.type === shellConfig.type)?.icon || '🌐'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
              {shellTypes.find(s => s.type === shellConfig.type)?.label || shellConfig.type}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Role: {userRole || 'None'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {Object.entries(shellConfig.features).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: value ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${value ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span style={{ fontSize: '12px' }}>{value ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shell Type Switcher */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Switch Shell Type
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {shellTypes.map((shell) => {
            const isActive = shellConfig.type === shell.type;
            return (
              <button
                key={shell.type}
                onClick={() => handleShellSwitch(shell.type)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: isActive
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
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
                    fontSize: '24px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    backgroundColor: isActive
                      ? 'rgba(99, 102, 241, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {shell.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.9)',
                      marginBottom: '3px',
                    }}
                  >
                    {shell.label}
                    {isActive && (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '9px',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(99, 102, 241, 0.3)',
                          color: '#a78bfa',
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {shell.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Toggles */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Feature Toggles
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(shellConfig.features).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleFeatureToggle(key as keyof ShellConfig['features'])}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                  {value ? 'Currently enabled' : 'Currently disabled'}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: value ? '#10b981' : '#4b5563',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: value ? '22px' : '2px',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div
        style={{
          padding: '10px',
          borderRadius: '8px',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#fbbf24', marginBottom: '3px' }}>
              Development Mode
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.4' }}>
              Manual shell switching overrides role-based selection. Changes reset on page reload.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
