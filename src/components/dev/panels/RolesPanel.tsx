import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const ROLE_OVERRIDE_KEY = 'dev-console:role-override';

export function RolesPanel() {
  const auth = useAuth();
  const [roleOverride, setRoleOverride] = useState<string | null>(() =>
    localStorage.getItem(ROLE_OVERRIDE_KEY)
  );

  const roles = [
    { id: 'user', label: 'משתמש', description: 'הרשאות משתמש בסיסי' },
    { id: 'business_owner', label: 'בעל עסק', description: 'ניהול עסקים' },
    { id: 'manager', label: 'מנהל', description: 'ניהול פעילות' },
    { id: 'driver', label: 'נהג', description: 'נהג משלוחים' },
    { id: 'dispatcher', label: 'משבץ', description: 'שיבוץ הזמנות' },
    { id: 'warehouse', label: 'מחסנאי', description: 'ניהול מלאי' },
    { id: 'accountant', label: 'רואה חשבון', description: 'ניהול פיננסי' },
    { id: 'infrastructure_owner', label: 'בעל תשתית', description: 'ניהול תשתית' },
    { id: 'admin', label: 'מנהל מערכת', description: 'ניהול מערכת' },
    { id: 'superadmin', label: 'מנהל על', description: 'גישה מלאה למערכת' },
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
          תפקיד נוכחי
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
              דורס
            </span>
          )}
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
          נקה דריסה
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
        תפקידים זמינים
      </div>

      {roles.map((role) => {
        const isActive = currentRole === role.id;
        return (
          <button
            key={role.id}
            onClick={() => handleRoleClick(role.id)}
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
              }}
            >
              {role.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
