import { useState } from 'react';
import { User } from '../../../data/types';
import { tokens } from '../../../styles/tokens';
import { hebrew } from '../../../lib/i18n';

interface RoleSelectionModalProps {
  onRoleSelect: (role: User['role']) => void;
  onCancel?: () => void;
}

const AVAILABLE_ROLES: Array<{
  value: User['role'];
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'manager',
    label: hebrew.manager,
    description: 'ניהול מבצעי, מלאי והזמנות',
    icon: '👔'
  },
  {
    value: 'dispatcher',
    label: hebrew.dispatcher,
    description: 'שיבוץ משלוחים וניתוב נהגים',
    icon: '📋'
  },
  {
    value: 'driver',
    label: hebrew.driver,
    description: 'ביצוע משלוחים ועדכוני סטטוס',
    icon: '🚗'
  },
  {
    value: 'warehouse',
    label: hebrew.warehouse,
    description: 'ניהול מחסן ומלאי',
    icon: '📦'
  },
  {
    value: 'sales',
    label: hebrew.sales,
    description: 'יצירת הזמנות ושירות לקוחות',
    icon: '💼'
  },
  {
    value: 'customer_service',
    label: hebrew.customer_service,
    description: 'תמיכה ושירות לקוחות',
    icon: '🎧'
  }
];

export function RoleSelectionModal({ onRoleSelect, onCancel }: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<User['role'] | null>(null);

  const handleSubmit = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      direction: 'rtl'
    }}>
      <div style={{
        backgroundColor: tokens.colors.background.cardBg,
        borderRadius: '20px',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: tokens.shadows.mdStrong
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${tokens.colors.border.default}`,
          background: 'linear-gradient(135deg, rgba(29, 155, 240, 0.2) 0%, rgba(123, 63, 242, 0.2) 100%)'
        }}>
          <div style={{
            fontSize: '32px',
            textAlign: 'center',
            marginBottom: '12px'
          }}>
            🎯
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text,
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            בחר תפקיד מבוקש
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: tokens.colors.subtle,
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            בחר את התפקיד שאתה מעוניין למלא במערכת.
            <br />
            מנהל המערכת יאשר את הבקשה שלך.
          </p>
        </div>

        {/* Role Options */}
        <div style={{
          padding: '20px'
        }}>
          {AVAILABLE_ROLES.map((role) => (
            <div
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              style={{
                padding: '16px',
                marginBottom: '12px',
                borderRadius: '12px',
                border: selectedRole === role.value
                  ? `2px solid ${tokens.colors.brand.primary}`
                  : `1px solid ${tokens.colors.border.default}`,
                backgroundColor: selectedRole === role.value
                  ? 'rgba(29, 155, 240, 0.1)'
                  : tokens.colors.bg,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (selectedRole !== role.value) {
                  e.currentTarget.style.backgroundColor = tokens.colors.bgHover;
                  e.currentTarget.style.borderColor = tokens.colors.background.cardBorderHover;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRole !== role.value) {
                  e.currentTarget.style.backgroundColor = tokens.colors.bg;
                  e.currentTarget.style.borderColor = tokens.colors.border.default;
                }
              }}
            >
              <div style={{
                fontSize: '32px',
                lineHeight: '1'
              }}>
                {role.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors.text,
                  marginBottom: '4px'
                }}>
                  {role.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: tokens.colors.subtle,
                  lineHeight: '1.4'
                }}>
                  {role.description}
                </div>
              </div>
              {selectedRole === role.value && (
                <div style={{
                  fontSize: '20px',
                  color: tokens.colors.brand.primary
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${tokens.colors.border.default}`,
          display: 'flex',
          gap: '12px',
          justifyContent: 'stretch'
        }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: `1px solid ${tokens.colors.border.default}`,
                backgroundColor: 'transparent',
                color: tokens.colors.subtle,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ביטול
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!selectedRole}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: selectedRole
                ? tokens.gradients.primary
                : tokens.colors.bg,
              color: selectedRole ? tokens.colors.textBright : tokens.colors.text.hint,
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedRole ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: selectedRole ? 1 : 0.5
            }}
          >
            אשר בחירה
          </button>
        </div>
      </div>
    </div>
  );
}
