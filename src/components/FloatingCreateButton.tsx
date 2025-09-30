import React, { useMemo, useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  action?: () => void;
}

interface RoleActionConfig {
  title: string;
  icon: string;
  actions: QuickAction[];
}

interface FloatingCreateButtonProps {
  userRole: string;
  triggerLabel?: string;
  triggerIcon?: string;
  onNavigate?: (page: string) => void;
  businessId?: string;
  onCreateOrder?: () => void;
  onCreateTask?: () => void;
  onScanBarcode?: () => void;
  onContactCustomer?: () => void;
  onCheckInventory?: () => void;
  onCreateRoute?: () => void;
  onCreateUser?: () => void;
  onCreateProduct?: () => void;
}

export function FloatingCreateButton({
  userRole,
  triggerLabel,
  triggerIcon,
  onNavigate,
  onCreateOrder,
  onCreateTask,
  onScanBarcode,
  onContactCustomer,
  onCheckInventory,
  onCreateRoute,
  onCreateUser,
  onCreateProduct
}: FloatingCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, haptic } = useTelegramUI();

  const actionConfig = useMemo<RoleActionConfig | null>(() => {
    const addAction = (
      actions: QuickAction[],
      action: QuickAction
    ) => {
      if (action.action) {
        actions.push(action);
      }
      return actions;
    };

    switch (userRole) {
      case 'owner':
      case 'manager': {
        const actions: QuickAction[] = [];
        addAction(actions, {
          id: 'create_order',
          label: 'הזמנה חדשה',
          icon: '🧾',
          color: '#007aff',
          description: 'פתח אשף הזמנה לעסק',
          action: onCreateOrder
        });
        addAction(actions, {
          id: 'create_task',
          label: 'משימת שטח',
          icon: '✅',
          color: '#34c759',
          description: 'שגר משימה לצוות התפעול',
          action: onCreateTask
        });
        addAction(actions, {
          id: 'create_route',
          label: 'מסלול נהגים',
          icon: '🗺️',
          color: '#ff9500',
          description: 'תכנן חלוקה מחדש לנהגים',
          action: onCreateRoute
        });
        addAction(actions, {
          id: 'create_user',
          label: 'חבר צוות חדש',
          icon: '👥',
          color: '#af52de',
          description: 'הוסף מנהל או עובד חדש',
          action: onCreateUser
        });
        addAction(actions, {
          id: 'create_product',
          label: 'פריט בקטלוג',
          icon: '🏷️',
          color: '#ff3b30',
          description: 'הוסף מוצר חדש למלאי',
          action: onCreateProduct
        });

        return actions.length
          ? {
              title: triggerLabel || 'פקודה חדשה',
              icon: triggerIcon || '🪄',
              actions
            }
          : null;
      }
      case 'sales': {
        const actions: QuickAction[] = [];
        addAction(actions, {
          id: 'dm_order',
          label: 'פתיחת הזמנה ב-DM',
          icon: '💬',
          color: '#007aff',
          description: 'התחל הזמנה דרך שיחת לקוח',
          action: onCreateOrder
        });
        addAction(actions, {
          id: 'storefront_order',
          label: 'הזמנה מחנות דיגיטלית',
          icon: '🛍️',
          color: '#ff9500',
          description: 'נווט לקטלוג לבניית הצעת מחיר',
          action: onNavigate ? () => onNavigate('products') : undefined
        });
        addAction(actions, {
          id: 'contact_customer',
          label: 'צור קשר עם לקוח',
          icon: '📞',
          color: '#34c759',
          description: 'המשך שיחה עם לקוח קיים',
          action: onContactCustomer
        });

        return actions.length
          ? {
              title: triggerLabel || 'הזמנה חדשה',
              icon: triggerIcon || '➕',
              actions
            }
          : null;
      }
      case 'warehouse': {
        const actions: QuickAction[] = [];
        addAction(actions, {
          id: 'scan_barcode',
          label: 'סריקת ברקוד',
          icon: '📱',
          color: '#34c759',
          description: 'סרוק פריט נכנס או יוצא',
          action: onScanBarcode
        });
        addAction(actions, {
          id: 'check_inventory',
          label: 'בדיקת מלאי',
          icon: '📦',
          color: '#ff9500',
          description: 'נווט למסך ניהול המלאי',
          action: onCheckInventory
        });
        addAction(actions, {
          id: 'create_task',
          label: 'דיווח תפעולי',
          icon: '🛠️',
          color: '#007aff',
          description: 'פתח משימה לטיפול בצוות',
          action: onCreateTask
        });

        return actions.length
          ? {
              title: triggerLabel || 'פעולת מלאי',
              icon: triggerIcon || '📦',
              actions
            }
          : null;
      }
      default:
        return null;
    }
  }, [
    onCheckInventory,
    onContactCustomer,
    onCreateOrder,
    onCreateProduct,
    onCreateRoute,
    onCreateTask,
    onCreateUser,
    onNavigate,
    onScanBarcode,
    triggerIcon,
    triggerLabel,
    userRole
  ]);

  if (!actionConfig) {
    return null;
  }

  const { actions, icon, title } = actionConfig;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    haptic();
  };

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    haptic();
    action.action?.();
  };

  const primaryAction = actions[0];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
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

      {/* Action Menu */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: theme.bg_color,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 1002,
            minWidth: '300px',
            maxWidth: '90vw',
            direction: 'rtl'
          }}
        >
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text_color,
            textAlign: 'center'
          }}>
            {title}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  backgroundColor: action.color + '10',
                  border: `2px solid ${action.color}30`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = action.color + '20';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = action.color + '10';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  marginBottom: '4px'
                }}>
                  {action.icon}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.text_color,
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {action.label}
                </div>
                {action.description && (
                  <div style={{
                    fontSize: '11px',
                    color: theme.hint_color,
                    textAlign: 'center',
                    lineHeight: '1.3',
                    marginTop: '4px'
                  }}>
                    {action.description}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Quick tip */}
          <div style={{
            marginTop: '16px',
            padding: '8px 12px',
            backgroundColor: theme.secondary_bg_color,
            borderRadius: '8px',
            fontSize: '11px',
            color: theme.hint_color,
            textAlign: 'center'
          }}>
            💡 לחיצה ארוכה על כפתור יצירה תפתח מיד את {primaryAction?.label || 'הפעולה הראשית'}
          </div>
        </div>
      )}

      {/* Main Create Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001
        }}
      >
        <button
          onClick={handleToggle}
          onContextMenu={(e) => {
            e.preventDefault();
            if (primaryAction?.action) {
              primaryAction.action();
              haptic();
            }
          }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: theme.button_color || '#007aff',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,123,255,0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,123,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
          }}
        >
          {isOpen ? '×' : icon}
        </button>

        {/* Role indicator */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: theme.secondary_bg_color,
          border: `2px solid ${theme.bg_color}`,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {getRoleIcon(userRole)}
        </div>
      </div>
    </>
  );
}

function getRoleIcon(role: string): string {
  const icons: { [key: string]: string } = {
    owner: '👑',
    manager: '👔',
    sales: '🤝',
    dispatcher: '📋',
    driver: '🚚',
    warehouse: '📦',
    customer_service: '🎧'
  };
  return icons[role] || '👤';
}