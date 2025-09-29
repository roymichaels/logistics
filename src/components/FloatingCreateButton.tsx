import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  action: () => void;
}

interface FloatingCreateButtonProps {
  userRole: string;
  businessId?: string;
  onCreateOrder: () => void;
  onCreateTask: () => void;
  onScanBarcode: () => void;
  onContactCustomer: () => void;
  onCheckInventory: () => void;
  onCreateRoute: () => void;
  onCreateUser: () => void;
  onCreateProduct: () => void;
}

export function FloatingCreateButton({
  userRole,
  businessId,
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
  const [actions, setActions] = useState<QuickAction[]>([]);
  const { theme, haptic } = useTelegramUI();

  useEffect(() => {
    setActions(getActionsForRole(userRole));
  }, [userRole, businessId]);

  const getActionsForRole = (role: string): QuickAction[] => {
    const actionMap: { [key: string]: QuickAction[] } = {
      manager: [
        {
          id: 'create_order',
          label: 'הזמנה חדשה',
          icon: '📦',
          color: '#007aff',
          description: 'צור הזמנה חדשה מלקוח',
          action: onCreateOrder
        },
        {
          id: 'create_task',
          label: 'משימה חדשה',
          icon: '✅',
          color: '#34c759',
          description: 'הקצה משימה לעובד',
          action: onCreateTask
        },
        {
          id: 'create_route',
          label: 'מסלול חדש',
          icon: '🗺️',
          color: '#ff9500',
          description: 'תכנן מסלול משלוחים',
          action: onCreateRoute
        },
        {
          id: 'create_user',
          label: 'עובד חדש',
          icon: '👤',
          color: '#af52de',
          description: 'הוסף עובד למערכת',
          action: onCreateUser
        },
        {
          id: 'create_product',
          label: 'מוצר חדש',
          icon: '🏷️',
          color: '#ff3b30',
          description: 'הוסף מוצר לקטלוג',
          action: onCreateProduct
        }
      ],

      sales: [
        {
          id: 'create_order',
          label: 'הזמנה חדשה',
          icon: '📦',
          color: '#007aff',
          description: 'צור הזמנה חדשה מלקוח',
          action: onCreateOrder
        },
        {
          id: 'contact_customer',
          label: 'צור קשר עם לקוח',
          icon: '📞',
          color: '#34c759',
          description: 'התקשר או שלח הודעה ללקוח',
          action: onContactCustomer
        },
        {
          id: 'scan_barcode',
          label: 'סרוק ברקוד',
          icon: '📱',
          color: '#ff9500',
          description: 'סרוק ברקוד מוצר',
          action: onScanBarcode
        }
      ],

      dispatcher: [
        {
          id: 'create_task',
          label: 'משימה חדשה',
          icon: '✅',
          color: '#34c759',
          description: 'הקצה משימה לנהג או עובד מחסן',
          action: onCreateTask
        },
        {
          id: 'create_route',
          label: 'מסלול חדש',
          icon: '🗺️',
          color: '#007aff',
          description: 'תכנן מסלול משלוחים',
          action: onCreateRoute
        },
        {
          id: 'contact_customer',
          label: 'צור קשר עם לקוח',
          icon: '📞',
          color: '#ff9500',
          description: 'התקשר ללקוח לתאום',
          action: onContactCustomer
        }
      ],

      driver: [
        {
          id: 'scan_barcode',
          label: 'סרוק ברקוד',
          icon: '📱',
          color: '#34c759',
          description: 'סרוק ברקוד למשלוח',
          action: onScanBarcode
        },
        {
          id: 'contact_customer',
          label: 'צור קשר עם לקוח',
          icon: '📞',
          color: '#007aff',
          description: 'התקשר ללקוח בנושא המשלוח',
          action: onContactCustomer
        }
      ],

      warehouse: [
        {
          id: 'scan_barcode',
          label: 'סרוק ברקוד',
          icon: '📱',
          color: '#34c759',
          description: 'סרוק ברקוד למוצר במלאי',
          action: onScanBarcode
        },
        {
          id: 'check_inventory',
          label: 'בדיקת מלאי',
          icon: '📋',
          color: '#ff9500',
          description: 'בדוק כמות במלאי',
          action: onCheckInventory
        },
        {
          id: 'create_task',
          label: 'משימה חדשה',
          icon: '✅',
          color: '#007aff',
          description: 'דווח על בעיה או צרך',
          action: onCreateTask
        }
      ],

      customer_service: [
        {
          id: 'create_order',
          label: 'הזמנה חדשה',
          icon: '📦',
          color: '#007aff',
          description: 'צור הזמנה עבור לקוח',
          action: onCreateOrder
        },
        {
          id: 'contact_customer',
          label: 'צור קשר עם לקוח',
          icon: '📞',
          color: '#34c759',
          description: 'התקשר או שלח הודעה ללקוח',
          action: onContactCustomer
        }
      ]
    };

    return actionMap[role] || actionMap.sales;
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    haptic();
  };

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    haptic();
    action.action();
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
            פעולות מהירות
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
            if (primaryAction) {
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
          {isOpen ? '×' : '+'}
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
    manager: '👨‍💼',
    sales: '🤝',
    dispatcher: '📋',
    driver: '🚚',
    warehouse: '📦',
    customer_service: '🎧'
  };
  return icons[role] || '👤';
}