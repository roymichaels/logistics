import React, { useMemo, useState } from 'react';

import { logger } from '../lib/logger';

type RoleKey =
  | 'user'
  | 'infrastructure_owner'
  | 'business_owner'
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
  onToggleDriverStatus?: () => void;
  onUpdateLocation?: () => void;
  onReportIssue?: () => void;
  onSearchOrder?: () => void;
  onUpdateOrderStatus?: () => void;
  onTransferInventory?: () => void;
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
  onNavigate,
  onToggleDriverStatus,
  onUpdateLocation,
  onReportIssue,
  onSearchOrder,
  onUpdateOrderStatus,
  onTransferInventory
}: FloatingCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = useMemo<QuickAction[]>(() => {
    if (userRole === 'infrastructure_owner' || userRole === 'business_owner' || userRole === 'manager') {
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
          id: 'sales-inventory-check',
          label: 'בדיקת מלאי',
          icon: '📦',
          color: '#34c759',
          description: 'בדוק מלאי זמין לפני יצירת הזמנה',
          action: () => {
            onNavigate?.('inventory');
          }
        },
        {
          id: 'sales-followup',
          label: 'מעקב ללקוח',
          icon: '🤝',
          color: '#5856d6',
          description: 'תאם שיחה או הודעה עם הלקוח',
          action: onContactCustomer
        },
        {
          id: 'sales-stats',
          label: 'הביצועים שלי',
          icon: '📈',
          color: '#af52de',
          description: 'צפה בביצועי המכירות שלך',
          action: () => {
            onNavigate?.('my-stats');
          }
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
          id: 'warehouse-transfer',
          label: 'העברת מלאי',
          icon: '🔄',
          color: '#ff9500',
          description: 'העבר מלאי בין מיקומים',
          action: onTransferInventory || (() => onNavigate?.('inventory'))
        },
        {
          id: 'warehouse-restock',
          label: 'בקשת חידוש',
          icon: '🔁',
          color: '#34c759',
          description: 'פתח בקשת חידוש מלאי',
          action: () => {
            onNavigate?.('restock-requests');
          }
        },
        {
          id: 'warehouse-inventory',
          label: 'ספירת מלאי',
          icon: '📋',
          color: '#5856d6',
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

    if (userRole === 'driver') {
      return [
        {
          id: 'driver-toggle-status',
          label: 'שינוי סטטוס',
          icon: '🟢',
          color: '#34c759',
          description: 'עבור מקוון/לא מקוון',
          action: onToggleDriverStatus || (() => onNavigate?.('driver-status'))
        },
        {
          id: 'driver-deliveries',
          label: 'המשלוחים שלי',
          icon: '🚚',
          color: '#007aff',
          description: 'הצג את רשימת המשלוחים הפעילים',
          action: () => {
            onNavigate?.('my-deliveries');
          }
        },
        {
          id: 'driver-inventory',
          label: 'המלאי שלי',
          icon: '📦',
          color: '#ff9500',
          description: 'בדוק את המלאי ברכב שלך',
          action: () => {
            onNavigate?.('my-inventory');
          }
        },
        {
          id: 'driver-location',
          label: 'עדכון מיקום',
          icon: '📍',
          color: '#5856d6',
          description: 'עדכן מיקום ידני לאופטימיזציה',
          action: onUpdateLocation || (() => {
            haptic();
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                () => {
                  haptic();
                  logger.info('Location updated');
                },
                (error) => logger.error('Location error:', error)
              );
            }
          })
        },
        {
          id: 'driver-restock',
          label: 'בקשת חידוש',
          icon: '🔄',
          color: '#af52de',
          description: 'צור בקשת חידוש מהשטח',
          action: () => {
            onNavigate?.('restock-requests');
          }
        },
        {
          id: 'driver-report-issue',
          label: 'דיווח בעיה',
          icon: '⚠️',
          color: '#ff3b30',
          description: 'דווח על תקלה או אירוע במהלך משלוח',
          action: onReportIssue || onCreateTask
        }
      ];
    }

    if (userRole === 'dispatcher') {
      return [
        {
          id: 'dispatcher-assign',
          label: 'הקצאת הזמנה',
          icon: '📋',
          color: '#007aff',
          description: 'הקצה הזמנה לנהג זמין',
          action: () => {
            onNavigate?.('dispatch-board');
          }
        },
        {
          id: 'dispatcher-coverage',
          label: 'כיסוי אזורי',
          icon: '🗺️',
          color: '#34c759',
          description: 'צפה בכיסוי אזורים בזמן אמת',
          action: () => {
            onNavigate?.('zone-management');
          }
        },
        {
          id: 'dispatcher-route',
          label: 'תכנון מסלול',
          icon: '🛣️',
          color: '#ff9500',
          description: 'תכנן מסלול אופטימלי לנהגים',
          action: onCreateRoute
        },
        {
          id: 'dispatcher-drivers',
          label: 'נהגים זמינים',
          icon: '🚚',
          color: '#5856d6',
          description: 'חפש נהג זמין לפי אזור',
          action: () => {
            onNavigate?.('driver-status');
          }
        },
        {
          id: 'dispatcher-orders',
          label: 'הזמנות ממתינות',
          icon: '📦',
          color: '#af52de',
          description: 'צפה בהזמנות הממתינות להקצאה',
          action: () => {
            onNavigate?.('orders');
          }
        }
      ];
    }

    if (userRole === 'customer_service') {
      return [
        {
          id: 'cs-search-order',
          label: 'חיפוש הזמנה',
          icon: '🔍',
          color: '#007aff',
          description: 'חפש הזמנה לפי טלפון או מספר',
          action: onSearchOrder || (() => onNavigate?.('orders'))
        },
        {
          id: 'cs-create-order',
          label: 'הזמנה חדשה',
          icon: '🧾',
          color: '#34c759',
          description: 'צור הזמנה עבור לקוח',
          action: onCreateOrder
        },
        {
          id: 'cs-update-status',
          label: 'עדכון סטטוס',
          icon: '✏️',
          color: '#ff9500',
          description: 'עדכן סטטוס הזמנה קיימת',
          action: onUpdateOrderStatus || (() => onNavigate?.('orders'))
        },
        {
          id: 'cs-service-ticket',
          label: 'פתק שירות',
          icon: '🎫',
          color: '#af52de',
          description: 'פתח פתק שירות לבעיה',
          action: onCreateTask
        },
        {
          id: 'cs-customer-chat',
          label: 'צ\'אט עם לקוח',
          icon: '💬',
          color: '#5856d6',
          description: 'פתח שיחת צ\'אט עם הלקוח',
          action: onContactCustomer
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
    onNavigate,
    onToggleDriverStatus,
    onUpdateLocation,
    onReportIssue,
    onSearchOrder,
    onUpdateOrderStatus,
    onTransferInventory,
    haptic
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
