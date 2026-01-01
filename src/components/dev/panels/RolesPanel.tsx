import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntryPointForRole } from '../../../routing/UnifiedRouter';
import { localSessionManager } from '../../../lib/localSessionManager';

const ROLE_OVERRIDE_KEY = 'dev-console:role-override';

const AVAILABLE_ROLES = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'driver', label: 'Driver' },
  { value: 'customer', label: 'Customer' },
  { value: 'user', label: 'Guest User' },
];

export function RolesPanel() {
  const navigate = useNavigate();
  const [switchingRole, setSwitchingRole] = useState(false);

  const currentSession = localSessionManager.getSession();
  const currentRole = localStorage.getItem(ROLE_OVERRIDE_KEY) || currentSession?.role || 'customer';

  const handleRoleSwitch = (newRole: string) => {
    if (!currentSession) {
      alert('Please connect your wallet first at /auth/login');
      return;
    }

    setSwitchingRole(true);

    localSessionManager.assignRoleToWallet(currentSession.wallet, newRole);
    localStorage.setItem(ROLE_OVERRIDE_KEY, newRole);

    window.dispatchEvent(new CustomEvent('dev-role-changed'));

    const entryPoint = getEntryPointForRole(newRole as any);

    setTimeout(() => {
      navigate(entryPoint);
      setSwitchingRole(false);
      window.location.reload();
    }, 150);
  };

  const clearSession = () => {
    localSessionManager.clearSession();
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
    navigate('/auth/login');
    window.location.reload();
  };

  const clearRoleOverride = () => {
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
    window.location.reload();
  };

  const hasOverride = localStorage.getItem(ROLE_OVERRIDE_KEY) !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      {/* Current Session Info */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px' }}>
          Current Session
        </div>
        {currentSession ? (
          <>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#a78bfa', fontFamily: 'monospace', marginBottom: '4px' }}>
              {currentRole}
              {hasOverride && (
                <span style={{ fontSize: '9px', color: '#fbbf24', marginLeft: '6px' }}>
                  (overridden)
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)' }}>
              Wallet: {currentSession.wallet.slice(0, 8)}...{currentSession.wallet.slice(-6)}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.25)', marginTop: '2px' }}>
              Type: {currentSession.walletType}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
            No active wallet session
          </div>
        )}
      </div>

      {/* Role Switcher */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.4)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Switch Role (Dev)
        </div>

        <select
          value={currentRole}
          onChange={(e) => handleRoleSwitch(e.target.value)}
          disabled={switchingRole || !currentSession}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            fontSize: '12px',
            fontWeight: '500',
            cursor: currentSession ? 'pointer' : 'not-allowed',
            opacity: currentSession ? 1 : 0.5,
          }}
        >
          {AVAILABLE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        {!currentSession && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.4)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
          }}>
            Connect wallet to enable role switching
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {hasOverride && (
          <button
            onClick={clearRoleOverride}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              fontSize: '11px',
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
            Clear Role Override
          </button>
        )}

        {currentSession && (
          <button
            onClick={clearSession}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            Logout & Clear Session
          </button>
        )}
      </div>
    </div>
  );
}
