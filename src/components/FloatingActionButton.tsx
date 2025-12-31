import React, { useState } from 'react';

import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { useAppServices } from '../context/AppServicesContext';
import { logger } from '../lib/logger';
import { useAuth } from '../context/AuthContext';

interface FloatingActionMenuProps {
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
  onNavigate,
  onShowModeSelector,
  isOpen,
  onClose
}: FloatingActionMenuProps) {
  const { user } = useAppServices();
  const authCtx = useAuth();
  const authRole = (authCtx?.user as any)?.role || null;
  void authRole;

  const getPathPrefix = (role: string): string => {
    if (['business_owner', 'manager', 'sales', 'dispatcher', 'warehouse', 'customer_service'].includes(role)) {
      return '/business/';
    }
    if (role === 'driver') {
      return '/driver/';
    }
    if (['infrastructure_owner', 'accountant'].includes(role)) {
      return '/infrastructure/';
    }
    if (['admin', 'superadmin'].includes(role)) {
      return '/admin/';
    }
    return '/';
  };

  const getRoleActions = (): RoleAction[] => {
    if (!user) return [];

    const actions: RoleAction[] = [];
    const pathPrefix = getPathPrefix(user.role);

    // Infrastructure Owner / Business Owner / Manager - Full access
    if (['infrastructure_owner', 'business_owner', 'manager'].includes(user.role)) {
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
          onNavigate(`${pathPrefix}products`);
        }
      });
      actions.push({
        icon: '📊',
        label: 'דוחות',
        description: 'צפה בדוחות והזמנות',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}reports`);
        }
      });
      actions.push({
        icon: '👥',
        label: 'ניהול נהגים',
        description: 'הקצאות ומעקב נהגים',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}dispatch`);
        }
      });
    }

    // Sales - Can create orders and track performance
    else if (user.role === 'sales') {
      actions.push({
        icon: '💬',
        label: 'הזמנה בשיחה',
        description: 'צור הזמנה ישירות עם לקוח',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onShowModeSelector();
        }
      });
      actions.push({
        icon: '🛒',
        label: 'חנות דיגיטלית',
        description: 'שלח קישור לחנות',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}products`);
        }
      });
      actions.push({
        icon: '📦',
        label: 'בדיקת מלאי',
        description: 'בדוק מלאי זמין',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}inventory`);
        }
      });
      actions.push({
        icon: '📈',
        label: 'הביצועים שלי',
        description: 'צפה בביצועי המכירות',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate('/my-stats');
        }
      });
    }

    // Dispatcher - Route planning and driver management
    else if (user.role === 'dispatcher') {
      actions.push({
        icon: '📋',
        label: 'הקצאת הזמנה',
        description: 'הקצה הזמנה לנהג זמין',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}dispatch`);
        }
      });
      actions.push({
        icon: '🗺️',
        label: 'כיסוי אזורי',
        description: 'צפה בכיסוי אזורים',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}zones`);
        }
      });
      actions.push({
        icon: '🚚',
        label: 'נהגים זמינים',
        description: 'חפש נהג זמין לפי אזור',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}drivers`);
        }
      });
      actions.push({
        icon: '📦',
        label: 'הזמנות ממתינות',
        description: 'צפה בהזמנות להקצאה',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}orders`);
        }
      });
    }

    // Driver - Delivery and status management
    else if (user.role === 'driver') {
      actions.push({
        icon: '🟢',
        label: 'שינוי סטטוס',
        description: 'עבור מקוון/לא מקוון',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate('/driver/status');
        }
      });
      actions.push({
        icon: '🚚',
        label: 'המשלוחים שלי',
        description: 'צפה במשלוחים פעילים',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate('/driver/deliveries');
        }
      });
      actions.push({
        icon: '📦',
        label: 'המלאי שלי',
        description: 'בדוק מלאי ברכב',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate('/driver/my-inventory');
        }
      });
      actions.push({
        icon: '📍',
        label: 'עדכון מיקום',
        description: 'עדכן מיקום ידני',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              () => logger.info('Location updated'),
              (error) => logger.error('Location error:', error)
            );
          }
        }
      });
    }

    // Warehouse - Inventory management
    else if (user.role === 'warehouse') {
      actions.push({
        icon: '📷',
        label: 'סריקת קבלה',
        description: 'סרוק ברקוד להזנת מלאי',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}incoming`);
        }
      });
      actions.push({
        icon: '🔄',
        label: 'העברת מלאי',
        description: 'העבר מלאי בין מיקומים',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}inventory`);
        }
      });
      actions.push({
        icon: '📋',
        label: 'ספירת מלאי',
        description: 'בצע ספירה מדגמית',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}warehouse`);
        }
      });
      actions.push({
        icon: '🔁',
        label: 'בקשת חידוש',
        description: 'פתח בקשת חידוש',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate('/restock-requests');
        }
      });
    }

    // Customer Service - Support and order management
    else if (user.role === 'customer_service') {
      actions.push({
        icon: '🔍',
        label: 'חיפוש הזמנה',
        description: 'חפש הזמנה לפי טלפון',
        color: ROYAL_COLORS.gradientPurple,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}orders`);
        }
      });
      actions.push({
        icon: '🧾',
        label: 'הזמנה חדשה',
        description: 'צור הזמנה עבור לקוח',
        color: ROYAL_COLORS.gradientSuccess,
        onClick: () => {
          onClose();
          onShowModeSelector();
        }
      });
      actions.push({
        icon: '✏️',
        label: 'עדכון סטטוס',
        description: 'עדכן סטטוס הזמנה',
        color: ROYAL_COLORS.gradientGold,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}orders`);
        }
      });
      actions.push({
        icon: '💬',
        label: 'צ\'אט עם לקוח',
        description: 'פתח שיחת צ\'אט',
        color: ROYAL_COLORS.gradientCrimson,
        onClick: () => {
          onClose();
          onNavigate(`${pathPrefix}chat`);
        }
      });
    }

    return actions;
  };

  const getRoleLabel = (): string => {
    if (!user) return '';
    switch (user.role) {
      case 'infrastructure_owner': return 'בעל תשתית';
      case 'business_owner': return 'בעל עסק';
      case 'manager': return 'מנהל';
      case 'sales': return 'מכירות';
      case 'dispatcher': return 'רכז';
      case 'driver': return 'נהג';
      case 'warehouse': return 'מחסן';
      case 'customer_service': return 'שירות לקוחות';
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
