import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Building2, Truck, Shield } from 'lucide-react';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/design-system';
import { roleAssignmentManager, UserRole } from '../lib/roleAssignment';
import { logger } from '../lib/logger';
import { useAuth } from '../context/AuthContext';

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelection = async (role: UserRole) => {
    if (!user?.id) {
      logger.error('No user found for role selection');
      return;
    }

    setIsSubmitting(true);

    try {
      roleAssignmentManager.assignRoleToWallet(user.id, role);

      logger.info(`Role ${role} assigned to ${user.id}`);

      window.location.reload();
    } catch (error) {
      logger.error('Failed to assign role', error);
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    {
      role: 'business_owner' as UserRole,
      title: 'בעל עסק',
      description: 'אני רוצה לנהל עסק ומכירות',
      icon: Building2,
      color: colors.brand.primary,
    },
    {
      role: 'customer' as UserRole,
      title: 'לקוח',
      description: 'אני רוצה לקנות מוצרים',
      icon: Store,
      color: colors.status.info,
    },
    {
      role: 'driver' as UserRole,
      title: 'נהג משלוחים',
      description: 'אני רוצה להתחיל לעבוד כנהג',
      icon: Truck,
      color: colors.status.success,
    },
    {
      role: 'infrastructure_owner' as UserRole,
      title: 'מנהל מערכת',
      description: 'ניהול תשתית ומערכת',
      icon: Shield,
      color: colors.status.warning,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background.primary,
        padding: spacing['2xl'],
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: spacing['4xl'], direction: 'rtl' }}>
          <h1
            style={{
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.lg,
            }}
          >
            ברוכים הבאים!
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
            }}
          >
            בחר את התפקיד שלך כדי להתחיל
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: spacing.lg,
            direction: 'rtl',
          }}
        >
          {roleOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.role}
                onClick={() => handleRoleSelection(option.role)}
                disabled={isSubmitting}
                style={{
                  background: colors.background.secondary,
                  border: `2px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing['2xl'],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xl,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                  opacity: isSubmitting ? 0.6 : 1,
                  textAlign: 'right',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.boxShadow = shadows.lg;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border.primary;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: borderRadius.xl,
                    background: `${option.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={32} color={option.color} strokeWidth={2} />
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {option.title}
                  </h3>
                  <p
                    style={{
                      fontSize: typography.fontSize.base,
                      color: colors.text.secondary,
                      margin: 0,
                      lineHeight: typography.lineHeight.normal,
                    }}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {isSubmitting && (
          <div
            style={{
              marginTop: spacing['2xl'],
              textAlign: 'center',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
            }}
          >
            מגדיר את התפקיד שלך...
          </div>
        )}
      </div>
    </div>
  );
}
