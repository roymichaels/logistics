import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export function RolesPanel() {
  const auth = useAuth();

  const roles = [
    { id: 'user', label: 'User', description: 'Basic user permissions' },
    { id: 'business_owner', label: 'Business Owner', description: 'Manage businesses' },
    { id: 'manager', label: 'Manager', description: 'Manage operations' },
    { id: 'driver', label: 'Driver', description: 'Delivery driver' },
    { id: 'dispatcher', label: 'Dispatcher', description: 'Dispatch orders' },
    { id: 'warehouse', label: 'Warehouse', description: 'Inventory management' },
    { id: 'accountant', label: 'Accountant', description: 'Financial management' },
    { id: 'infrastructure_owner', label: 'Infrastructure Owner', description: 'Infrastructure management' },
    { id: 'admin', label: 'Admin', description: 'System administration' },
    { id: 'superadmin', label: 'Super Admin', description: 'Full system access' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#a78bfa',
            fontFamily: 'monospace',
          }}
        >
          {auth?.user?.role || 'Not authenticated'}
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
        Available Roles
      </div>

      {roles.map((role) => {
        const isActive = auth?.user?.role === role.id;
        return (
          <div
            key={role.id}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isActive
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
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
              }}
            >
              {role.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
