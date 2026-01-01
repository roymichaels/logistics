import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntryPointForRole } from '../../../routing/UnifiedRouter';
import { localSessionManager } from '../../../lib/localSessionManager';

const ROLE_OVERRIDE_KEY = 'dev-console:role-override';

interface TestUser {
  wallet: string;
  role: string;
  name: string;
  business?: string;
}

const TEST_USERS: TestUser[] = [
  { wallet: '0xSUPERADMIN', role: 'superadmin', name: 'Super Admin' },
  { wallet: '0xADMIN', role: 'admin', name: 'Platform Admin' },
  { wallet: '0xOWNER1', role: 'business_owner', name: 'TechMart Owner', business: 'TechMart' },
  { wallet: '0xOWNER2', role: 'business_owner', name: 'Fresh Foods Owner', business: 'Fresh Foods' },
  { wallet: '0xOWNER3', role: 'business_owner', name: 'Fashion Hub Owner', business: 'Fashion Hub' },
  { wallet: '0xMANAGER1', role: 'manager', name: 'Store Manager', business: 'TechMart' },
  { wallet: '0xDISPATCH1', role: 'dispatcher', name: 'Dispatcher', business: 'TechMart' },
  { wallet: '0xWAREHOUSE1', role: 'warehouse', name: 'Warehouse', business: 'TechMart' },
  { wallet: '0xSALES1', role: 'sales', name: 'Sales Rep', business: 'TechMart' },
  { wallet: '0xSUPPORT1', role: 'customer_service', name: 'Support', business: 'TechMart' },
];

export function RolesPanel() {
  const navigate = useNavigate();
  const [, forceUpdate] = useState({});

  const currentSession = localSessionManager.getSession();
  const currentRole = localStorage.getItem(ROLE_OVERRIDE_KEY) || currentSession?.role || 'customer';

  const quickLogin = (user: TestUser) => {
    localSessionManager.assignRoleToWallet(user.wallet, user.role);

    const session = localSessionManager.createSession(
      user.wallet,
      'ethereum',
      'dev-signature',
      'dev-message',
      user.role
    );

    localStorage.setItem(ROLE_OVERRIDE_KEY, user.role);

    const entryPoint = getEntryPointForRole(user.role as any);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Current Role
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#a78bfa', fontFamily: 'monospace' }}>
          {currentRole}
        </div>
        {currentSession && (
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)', marginTop: '4px' }}>
            Wallet: {currentSession.wallet.slice(0, 8)}...
          </div>
        )}
      </div>

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
          Quick Login
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
          {TEST_USERS.map((user) => (
            <button
              key={user.wallet}
              onClick={() => quickLogin(user)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: currentSession?.wallet === user.wallet
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(59, 130, 246, 0.08)',
                border: currentSession?.wallet === user.wallet
                  ? '1px solid rgba(139, 92, 246, 0.3)'
                  : '1px solid rgba(59, 130, 246, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentSession?.wallet === user.wallet
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(59, 130, 246, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentSession?.wallet === user.wallet
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(59, 130, 246, 0.08)';
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#60a5fa', marginBottom: '2px' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>
                {user.role} {user.business && `• ${user.business}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {currentSession && (
        <button
          onClick={clearSession}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '12px',
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
  );
}
