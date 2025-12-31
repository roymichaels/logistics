import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getEntryPointForRole } from '../../../routing/UnifiedRouter';
import { useNavigate } from 'react-router-dom';

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
  const auth = useAuth();
  const navigate = useNavigate();
  const [roleOverride, setRoleOverride] = useState<string | null>(() =>
    localStorage.getItem(ROLE_OVERRIDE_KEY)
  );

  const roles = [
    { id: 'user', label: 'User', description: 'Basic user access', entryPoint: '/store/catalog' },
    { id: 'customer', label: 'Customer', description: 'Shopping customer', entryPoint: '/store/catalog' },
    { id: 'driver', label: 'Driver', description: 'Delivery driver', entryPoint: '/driver/deliveries' },
    { id: 'sales', label: 'Sales', description: 'Sales representative', entryPoint: '/business/orders' },
    { id: 'customer_service', label: 'Support', description: 'Customer service', entryPoint: '/business/orders' },
    { id: 'warehouse', label: 'Warehouse', description: 'Inventory management', entryPoint: '/business/inventory' },
    { id: 'dispatcher', label: 'Dispatcher', description: 'Order routing', entryPoint: '/business/dispatch' },
    { id: 'manager', label: 'Manager', description: 'Operations management', entryPoint: '/business/dashboard' },
    { id: 'business_owner', label: 'Business Owner', description: 'Business management', entryPoint: '/business/dashboard' },
    { id: 'accountant', label: 'Accountant', description: 'Financial specialist', entryPoint: '/infrastructure/dashboard' },
    { id: 'infrastructure_owner', label: 'Infrastructure Owner', description: 'Multi-business owner', entryPoint: '/infrastructure/dashboard' },
    { id: 'admin', label: 'Admin', description: 'Platform admin', entryPoint: '/admin/platform-dashboard' },
    { id: 'superadmin', label: 'Super Admin', description: 'Full system access', entryPoint: '/admin/platform-dashboard' },
  ];

  const currentRole = roleOverride || auth?.user?.role || 'user';

  const handleRoleClick = (roleId: string) => {
    if (roleId === currentRole && roleOverride) {
      localStorage.removeItem(ROLE_OVERRIDE_KEY);
      setRoleOverride(null);
      window.dispatchEvent(new CustomEvent('dev-role-changed'));
    } else {
      localStorage.setItem(ROLE_OVERRIDE_KEY, roleId);
      setRoleOverride(roleId);
      window.dispatchEvent(new CustomEvent('dev-role-changed'));
    }
  };

  const clearOverride = () => {
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
    setRoleOverride(null);
    window.dispatchEvent(new CustomEvent('dev-role-changed'));
  };

  const quickLogin = (user: TestUser) => {
    const session = {
      wallet: user.wallet,
      walletAddress: user.wallet,
      walletType: 'eth',
      role: user.role,
      user: {
        id: user.wallet,
        wallet_address: user.wallet,
        role: user.role,
        name: user.name,
      },
      timestamp: Date.now(),
    };
    localStorage.setItem('local-wallet-session', JSON.stringify(session));
    localStorage.setItem(ROLE_OVERRIDE_KEY, user.role);
    setRoleOverride(user.role);

    const entryPoint = getEntryPointForRole(user.role as any);
    navigate(entryPoint);
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#a78bfa',
              fontFamily: 'monospace',
            }}
          >
            {currentRole}
          </div>
          {roleOverride && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                color: '#fbbf24',
                fontWeight: '500',
              }}
            >
              Override
            </span>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.4)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick Login (Test Users)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TEST_USERS.map((user) => (
            <button
              key={user.wallet}
              onClick={() => quickLogin(user)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#60a5fa', marginBottom: '2px' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                {user.role} {user.business && `• ${user.business}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {roleOverride && (
        <button
          onClick={clearOverride}
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

      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.4)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Available Roles & Entry Points
        </div>

        {roles.map((role) => {
          const isActive = currentRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => {
                handleRoleClick(role.id);
                setTimeout(() => {
                  const entryPoint = role.entryPoint;
                  navigate(entryPoint);
                }, 100);
              }}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isActive
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                marginBottom: '8px',
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
                  <span style={{ fontSize: '12px', color: '#a78bfa' }}>●</span>
                )}
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: isActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {role.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginLeft: isActive ? '20px' : '0',
                  marginBottom: '2px',
                }}
              >
                {role.description}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  marginLeft: isActive ? '20px' : '0',
                  fontFamily: 'monospace',
                }}
              >
                → {role.entryPoint}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
