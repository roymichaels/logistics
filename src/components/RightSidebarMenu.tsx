import React from 'react';
import { telegram } from '../../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  page: string;
}

interface RightSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'owner' | 'manager' | 'driver' | 'warehouse' | 'sales' | 'dispatcher' | 'customer_service' | null;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function RightSidebarMenu({ isOpen, onClose, userRole, currentPage, onNavigate }: RightSidebarMenuProps) {
  const getMenuItems = (): MenuItem[] => {
    if (!userRole) return [];

    const menuMap: Record<string, MenuItem[]> = {
      owner: [
        { id: 'dashboard', label: 'לוח בקרה', icon: '🏠', page: 'dashboard' },
        { id: 'orders', label: 'הזמנות', icon: '📦', page: 'orders' },
        { id: 'drivers', label: 'נהגים', icon: '🚚', page: 'driver-status' },
        { id: 'inventory', label: 'מלאי', icon: '📊', page: 'manager-inventory' },
        { id: 'products', label: 'מוצרים', icon: '🏷️', page: 'products' },
        { id: 'reports', label: 'דוחות', icon: '📈', page: 'reports' },
        { id: 'partners', label: 'שותפים', icon: '👥', page: 'partners' },
        { id: 'zones', label: 'ניהול אזורים', icon: '🗺️', page: 'zone-management' },
        { id: 'dispatch', label: 'לוח משלוחים', icon: '📋', page: 'dispatch-board' },
        { id: 'users', label: 'ניהול משתמשים', icon: '👤', page: 'users' }
      ],
      manager: [
        { id: 'dashboard', label: 'לוח בקרה', icon: '🏠', page: 'dashboard' },
        { id: 'orders', label: 'הזמנות', icon: '📦', page: 'orders' },
        { id: 'drivers', label: 'נהגים', icon: '🚚', page: 'driver-status' },
        { id: 'inventory', label: 'מלאי', icon: '📊', page: 'manager-inventory' },
        { id: 'products', label: 'מוצרים', icon: '🏷️', page: 'products' },
        { id: 'reports', label: 'דוחות', icon: '📈', page: 'reports' },
        { id: 'partners', label: 'שותפים', icon: '👥', page: 'partners' },
        { id: 'zones', label: 'ניהול אזורים', icon: '🗺️', page: 'zone-management' },
        { id: 'dispatch', label: 'לוח משלוחים', icon: '📋', page: 'dispatch-board' }
      ],
      sales: [
        { id: 'orders', label: 'הזמנות', icon: '📦', page: 'orders' },
        { id: 'products', label: 'מוצרים', icon: '🏷️', page: 'products' },
        { id: 'my-stats', label: 'הביצועים שלי', icon: '📈', page: 'my-stats' },
        { id: 'customers', label: 'לקוחות', icon: '👥', page: 'customers' }
      ],
      warehouse: [
        { id: 'inventory', label: 'מלאי', icon: '📦', page: 'inventory' },
        { id: 'incoming', label: 'הגעות', icon: '🚚', page: 'incoming' },
        { id: 'restock', label: 'בקשות חידוש', icon: '🔄', page: 'restock-requests' },
        { id: 'logs', label: 'יומנים', icon: '📋', page: 'logs' }
      ],
      driver: [
        { id: 'deliveries', label: 'המשלוחים שלי', icon: '🚚', page: 'my-deliveries' },
        { id: 'my-inventory', label: 'המלאי שלי', icon: '📦', page: 'my-inventory' },
        { id: 'zones', label: 'האזורים שלי', icon: '🗺️', page: 'my-zones' },
        { id: 'status', label: 'סטטוס', icon: '🟢', page: 'driver-status' }
      ],
      dispatcher: [
        { id: 'dispatch', label: 'לוח משלוחים', icon: '📋', page: 'dispatch-board' },
        { id: 'drivers', label: 'נהגים', icon: '🚚', page: 'driver-status' },
        { id: 'orders', label: 'הזמנות', icon: '📦', page: 'orders' }
      ],
      customer_service: [
        { id: 'orders', label: 'הזמנות', icon: '📦', page: 'orders' },
        { id: 'customers', label: 'לקוחות', icon: '👥', page: 'customers' }
      ]
    };

    return menuMap[userRole] || [];
  };

  const handleItemClick = (page: string) => {
    telegram.hapticFeedback('selection');
    onNavigate(page);
    onClose();
  };

  const getRoleLabel = (): string => {
    switch (userRole) {
      case 'owner': return 'בעלים';
      case 'manager': return 'מנהל';
      case 'sales': return 'מכירות';
      case 'warehouse': return 'מחסן';
      case 'driver': return 'נהג';
      case 'dispatcher': return 'רכז';
      case 'customer_service': return 'שירות לקוחות';
      default: return 'משתמש';
    }
  };

  if (!isOpen) return null;

  const menuItems = getMenuItems();

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 999,
          animation: 'fadeIn 0.3s ease'
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(320px, 80vw)',
          background: 'linear-gradient(180deg, rgba(25, 0, 80, 0.98) 0%, rgba(12, 2, 25, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease',
          direction: 'rtl',
          borderLeft: `1px solid ${ROYAL_COLORS.cardBorder}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: ROYAL_COLORS.text
            }}>
              תפקידי
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: ROYAL_COLORS.muted
            }}>
              {getRoleLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: ROYAL_COLORS.text,
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px'
        }}>
          {menuItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.page)}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginBottom: '8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                    : 'transparent',
                  color: ROYAL_COLORS.text,
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'right',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(156, 109, 255, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(156, 109, 255, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`
        }}>
          <div style={{
            fontSize: '11px',
            color: ROYAL_COLORS.muted,
            textAlign: 'center'
          }}>
            גרסה 1.0.0
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
