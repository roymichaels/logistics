import React, { useState } from 'react';
import { telegram } from '../../lib/telegram';
import { User } from '../../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface FloatingActionMenuProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onShowModeSelector: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface RoleAction {
  icon: string;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}

export function FloatingActionMenu({
  user,
  onNavigate,
  onShowModeSelector,
  isOpen,
  onClose
}: FloatingActionMenuProps) {
  const getRoleActions = (): RoleAction[] => {
    if (!user) return [];

    const actions: RoleAction[] = [];

    // Owner/Manager - Full access
    if (['owner', 'manager'].includes(user.role)) {
      actions.push({
        icon: '📦',
        label: 'הזמנה חדשה',
        description: 'צור הזמנה מטלגרם או ממשק',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onShowModeSelector();
        }
      });
      actions.push({
        icon: '🏷️',
        label: 'מוצר חדש',
        description: 'הוסף מוצר לקטלוג',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate('products');
          telegram.hapticFeedback('success');
        }
      });
      actions.push({
        icon: '📊',
        label: 'דוחות',
        description: 'צפה בדוחות והזמנות',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate('reports');
        }
      });
      actions.push({
        icon: '👥',
        label: 'ניהול נהגים',
        description: 'הקצאות ומעקב נהגים',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate('dispatch');
        }
      });
    }

    // Sales - Can create orders
    else if (user.role === 'sales') {
      actions.push({
        icon: '📦',
        label: 'הזמנה חדשה',
        description: 'צור הזמנה מטלגרם או ממשק',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onShowModeSelector();
        }
      });
      actions.push({
        icon: '📈',
        label: 'ההזמנות שלי',
        description: 'צפה בהזמנות שיצרת',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate('orders');
        }
      });
    }

    // Dispatcher - Assign orders
    else if (user.role === 'dispatcher') {
      actions.push({
        icon: '🚚',
        label: 'הקצה משלוח',
        description: 'הקצה הזמנות לנהגים',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate('dispatch');
        }
      });
      actions.push({
        icon: '📍',
        label: 'מעקב נהגים',
        description: 'מיקום ומצב נהגים בזמן אמת',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate('driver-status');
        }
      });
    }

    // Driver - View their deliveries
    else if (user.role === 'driver') {
      actions.push({
        icon: '📦',
        label: 'המשלוחים שלי',
        description: 'צפה במשלוחים שהוקצו לך',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate('my-deliveries');
        }
      });
      actions.push({
        icon: '📍',
        label: 'עדכן סטטוס',
        description: 'עדכן מיקום ומצב משלוח',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate('driver-status');
        }
      });
    }

    // Warehouse - Inventory operations
    else if (user.role === 'warehouse') {
      actions.push({
        icon: '📦',
        label: 'בדיקת מלאי',
        description: 'צפה ועדכן מלאי',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate('inventory');
        }
      });
      actions.push({
        icon: '🏷️',
        label: 'בקשות חידוש',
        description: 'בקשות חידוש מלאי',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate('restock-requests');
        }
      });
    }

    return actions;
  };

  const getRoleLabel = (): string => {
    if (!user) return '';
    switch (user.role) {
      case 'owner': return 'בעלים';
      case 'manager': return 'מנהל';
      case 'sales': return 'מכירות';
      case 'dispatcher': return 'רכז';
      case 'driver': return 'נהג';
      case 'warehouse': return 'מחסן';
      default: return 'משתמש';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...ROYAL_STYLES.card,
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          marginBottom: '80px',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textAlign: 'center'
        }}>
          ⚡ פעולות מהירות
        </h2>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '13px',
          color: ROYAL_COLORS.muted,
          textAlign: 'center'
        }}>
          {getRoleLabel()}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {getRoleActions().map((action, index) => (
            <button
              key={index}
              onClick={() => {
                telegram.hapticFeedback('impact', 'medium');
                action.onClick();
              }}
              style={{
                padding: '16px',
                background: action.color,
                border: 'none',
                borderRadius: '12px',
                color: ROYAL_COLORS.textBright,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ fontSize: '32px' }}>{action.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {action.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            telegram.hapticFeedback('selection');
            onClose();
          }}
          style={{
            padding: '12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            color: ROYAL_COLORS.muted,
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '16px',
            width: '100%'
          }}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
