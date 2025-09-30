import React, { useMemo, useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

type RoleKey =
  | 'user'
  | 'owner'
  | 'manager'
  | 'dispatcher'
  | 'driver'
  | 'warehouse'
  | 'sales'
  | 'customer_service';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  action: () => void;
}

interface FloatingCreateButtonProps {
  userRole: RoleKey;
  businessId?: string;
  actionLabel: string;
  actionIcon: string;
  disabled?: boolean;
  onCreateOrder: () => void;
  onCreateTask: () => void;
  onScanBarcode: () => void;
  onContactCustomer: () => void;
  onCheckInventory: () => void;
  onCreateRoute: () => void;
  onCreateUser: () => void;
  onCreateProduct: () => void;
  onNavigate?: (page: string) => void;
}

export function FloatingCreateButton({
  userRole,
  actionLabel,
  actionIcon,
  disabled,
  onCreateOrder,
  onCreateTask,
  onScanBarcode,
  onContactCustomer,
  onCheckInventory,
  onCreateRoute,
  onCreateUser,
  onCreateProduct,
  onNavigate
}: FloatingCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, haptic } = useTelegramUI();

  const actions = useMemo<QuickAction[]>(() => {
    if (userRole === 'owner' || userRole === 'manager') {
      return [
        {
          id: 'command-order',
          label: 'פקודת הזמנה',
          icon: '🧾',
          color: '#007aff',
          description: 'התחל הזמנה חדשה לצוות המכירות',
          action: onCreateOrder
        },
        {
          id: 'command-task',
          label: 'משימת צוות',
          icon: '🗂️',
          color: '#34c759',
          description: 'הקצה משימה תפעולית לצוות',
          action: onCreateTask
        },
        {
          id: 'command-inventory',
          label: 'פעולת מלאי',
          icon: '📦',
          color: '#ff9500',
          description: 'בדוק מלאי או פתח ספירה',
          action: onCheckInventory
        },
        {
          id: 'command-route',
          label: 'מסלול חדש',
          icon: '🗺️',
          color: '#af52de',
          description: 'תכנן מסלול משלוחים לצוות הנהגים',
          action: onCreateRoute
        },
        {
          id: 'command-user',
          label: 'הוספת משתמש',
          icon: '👥',
          color: '#ff3b30',
          description: 'פתח משתמש או ספק חדש',
          action: onCreateUser
        },
        {
          id: 'command-product',
          label: 'פריט קטלוג',
          icon: '🏷️',
          color: '#0a84ff',
          description: 'הוסף או עדכן פריט בקטלוג',
          action: onCreateProduct
        }
      ];
    }

    if (userRole === 'sales') {
      return [
        {
          id: 'sales-dm-order',
          label: 'הזמנה בשיחה',
          icon: '💬',
          color: '#007aff',
          description: 'פתח הזמנה ישירות עם הלקוח',
          action: onCreateOrder
        },
        {
          id: 'sales-storefront',
          label: 'חנות דיגיטלית',
          icon: '🛒',
          color: '#ff9500',
          description: 'שלח קישור לחנות או הכן סל קנייה',
          action: () => {
            onNavigate?.('products');
          }
        },
        {
          id: 'sales-followup',
          label: 'מעקב ללקוח',
          icon: '🤝',
          color: '#34c759',
          description: 'תאם שיחה או הודעה עם הלקוח',
          action: onContactCustomer
        }
      ];
    }

    if (userRole === 'warehouse') {
      return [
        {
          id: 'warehouse-scan',
          label: 'סריקת קבלה',
          icon: '📷',
          color: '#007aff',
          description: 'סרוק ברקוד להזנת מלאי',
          action: onScanBarcode
        },
        {
          id: 'warehouse-restock',
          label: 'בקשת חידוש',
          icon: '🔄',
          color: '#ff9500',
          description: 'פתח בקשת חידוש מלאי',
          action: () => {
            onNavigate?.('restock-requests');
          }
        },
        {
          id: 'warehouse-inventory',
          label: 'בדיקת מלאי',
          icon: '📋',
          color: '#34c759',
          description: 'בצע ספירה מדגמית במלאי',
          action: onCheckInventory
        },
        {
          id: 'warehouse-issue',
          label: 'דיווח חריגה',
          icon: '⚠️',
          color: '#af52de',
          description: 'פתח משימת טיפול לצוות',
          action: onCreateTask
        }
      ];
    }

    return [];
  }, [
    userRole,
    onCreateOrder,
    onCreateTask,
    onScanBarcode,
    onContactCustomer,
    onCheckInventory,
    onCreateRoute,
    onCreateUser,
    onCreateProduct,
    onNavigate
  ]);

  const isDisabled = disabled || actions.length === 0;
  const primaryAction = actions[0];

  const handleToggle = () => {
    if (isDisabled) {
      haptic();
      return;
    }

    setIsOpen((prev) => !prev);
    haptic();
  };

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    haptic();
    action.action();
  };

  return (
    <>
      {isOpen && !isDisabled && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 1001,
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && !isDisabled && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: theme.bg_color,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            zIndex: 1002,
            minWidth: '320px',
            maxWidth: '90vw',
            direction: 'rtl'
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontWeight: 600,
              marginBottom: '12px',
              color: theme.text_color
            }}
          >
            {actionLabel}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: `${action.color}15`,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <span style={{ fontSize: '24px' }}>{action.icon}</span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: theme.text_color }}>{action.label}</div>
                  {action.description && (
                    <div style={{ fontSize: '12px', color: theme.hint_color }}>{action.description}</div>
                  )}
                </span>
              </button>
            ))}
          </div>

          {primaryAction && (
            <div
              style={{
                marginTop: '16px',
                padding: '8px 12px',
                backgroundColor: theme.secondary_bg_color,
                borderRadius: '8px',
                color: theme.hint_color,
                fontSize: '11px',
                textAlign: 'center'
              }}
            >
              💡 לחיצה ארוכה תפעיל מיד את "{primaryAction.label}"
            </div>
          )}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <button
          onClick={handleToggle}
          onContextMenu={(event) => {
            event.preventDefault();
            if (primaryAction && !isDisabled) {
              haptic();
              primaryAction.action();
            }
          }}
          disabled={isDisabled}
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isDisabled ? `${theme.hint_color}30` : theme.button_color || '#007aff',
            color: isDisabled ? theme.hint_color : theme.button_text_color || '#ffffff',
            fontSize: '26px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            boxShadow: isDisabled ? 'none' : '0 8px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          {isOpen ? '×' : actionIcon}
        </button>
        <span style={{ fontSize: '12px', color: theme.hint_color }}>{actionLabel}</span>
      </div>
    </>
  );
}
