import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntryPointForRole } from '../../../routing/UnifiedRouter';
import { localSessionManager } from '../../../lib/localSessionManager';

const ROLE_OVERRIDE_KEY = 'dev-console:role-override';

const AVAILABLE_ROLES = [
  { value: 'superadmin', label: 'Superadmin', category: 'Platform' },
  { value: 'admin', label: 'Admin', category: 'Platform' },
  { value: 'infrastructure_owner', label: 'Infrastructure Owner', category: 'Infrastructure' },
  { value: 'accountant', label: 'Accountant', category: 'Infrastructure' },
  { value: 'business_owner', label: 'Business Owner', category: 'Business' },
  { value: 'manager', label: 'Manager', category: 'Business' },
  { value: 'warehouse', label: 'Warehouse', category: 'Business' },
  { value: 'dispatcher', label: 'Dispatcher', category: 'Business' },
  { value: 'sales', label: 'Sales', category: 'Business' },
  { value: 'customer_service', label: 'Customer Service', category: 'Business' },
  { value: 'driver', label: 'Driver', category: 'Delivery' },
  { value: 'customer', label: 'Customer', category: 'Store' },
  { value: 'user', label: 'Guest User', category: 'Store' },
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
    localStorage.setItem(ROLE_OVERRIDE_KEY, newRole);

    const entryPoint = getEntryPointForRole(newRole as any);
    navigate(entryPoint);

    setTimeout(() => {
      window.location.reload();
    }, 100);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
      {/* Warning Banner */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#fbbf24', marginBottom: '4px' }}>
          Dev Mode Only
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.4' }}>
          Role switching requires wallet authentication. Connect your wallet first at /auth/login
        </div>
      </div>

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
          {AVAILABLE_ROLES.map((role, index, array) => {
            const prevCategory = index > 0 ? array[index - 1].category : null;
            const showCategory = role.category !== prevCategory;

            return (
              <React.Fragment key={role.value}>
                {showCategory && (
                  <option disabled style={{ fontWeight: 'bold', fontSize: '11px' }}>
                    ──── {role.category} ────
                  </option>
                )}
                <option value={role.value}>
                  {role.label}
                </option>
              </React.Fragment>
            );
          })}
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

      {/* Role-to-Shell Mapping Reference */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '6px', fontWeight: '600' }}>
          Shell Mapping
        </div>
        <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.3)', lineHeight: '1.6', fontFamily: 'monospace' }}>
          <div>Admin/Superadmin → AdminShell</div>
          <div>Infrastructure → InfrastructureShell</div>
          <div>Business Roles → BusinessShell</div>
          <div>Driver → DriverShell</div>
          <div>Customer/User → StoreShell</div>
        </div>
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
