import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const routes = [
  { path: '/store/catalog', label: 'קטלוג', category: 'חנות' },
  { path: '/store/cart', label: 'עגלה', category: 'חנות' },
  { path: '/store/checkout', label: 'תשלום', category: 'חנות' },
  { path: '/store/orders', label: 'הזמנות חנות', category: 'חנות' },
  { path: '/store/profile', label: 'פרופיל חנות', category: 'חנות' },
  { path: '/business/dashboard', label: 'לוח בקרה עסקי', category: 'עסק' },
  { path: '/business/products', label: 'מוצרים', category: 'עסק' },
  { path: '/business/orders', label: 'הזמנות', category: 'עסק' },
  { path: '/business/restock', label: 'חידוש מלאי', category: 'עסק' },
  { path: '/business/inventory', label: 'מלאי', category: 'עסק' },
  { path: '/business/incoming', label: 'נכנס', category: 'עסק' },
  { path: '/business/reports', label: 'דוחות', category: 'עסק' },
  { path: '/business/drivers', label: 'נהגים', category: 'עסק' },
  { path: '/business/zones', label: 'אזורים', category: 'עסק' },
  { path: '/business/warehouse', label: 'מחסן', category: 'עסק' },
  { path: '/business/dispatch', label: 'שיבוץ', category: 'עסק' },
  { path: '/driver/dashboard', label: 'לוח בקרה נהג', category: 'נהג' },
  { path: '/driver/tasks', label: 'משימות', category: 'נהג' },
  { path: '/driver/my-deliveries', label: 'המשלוחים שלי', category: 'נהג' },
  { path: '/driver/my-inventory', label: 'המלאי שלי', category: 'נהג' },
  { path: '/driver/my-zones', label: 'האזורים שלי', category: 'נהג' },
  { path: '/driver/status', label: 'סטטוס', category: 'נהג' },
  { path: '/admin/analytics', label: 'אנליטיקה', category: 'מנהל' },
  { path: '/admin/businesses', label: 'עסקים', category: 'מנהל' },
  { path: '/admin/users', label: 'משתמשים', category: 'מנהל' },
  { path: '/admin/logs', label: 'לוגים', category: 'מנהל' },
  { path: '/channels', label: 'ערוצים', category: 'חברתי' },
  { path: '/chat', label: 'צ׳אט', category: 'חברתי' },
  { path: '/notifications', label: 'התראות', category: 'חברתי' },
  { path: '/user-homepage', label: 'דף הבית', category: 'משתמש' },
  { path: '/social-feed', label: 'פיד', category: 'משתמש' },
  { path: '/social-profile', label: 'פרופיל חברתי', category: 'משתמש' },
  { path: '/social-analytics', label: 'אנליטיקה חברתית', category: 'משתמש' },
  { path: '/my-stats', label: 'הסטטיסטיקות שלי', category: 'משתמש' },
  { path: '/my-role', label: 'התפקיד שלי', category: 'משתמש' },
  { path: '/sandbox', label: 'ארגז חול', category: 'פיתוח' },
  { path: '/start-new', label: 'התחל חדש', category: 'פיתוח' },
  { path: '/kyc', label: 'זרימת KYC', category: 'אימות' },
];

export function RoutesPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  const categories = Array.from(new Set(routes.map((r) => r.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          נתיב נוכחי
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#60a5fa',
            fontFamily: 'monospace',
          }}
        >
          {location.pathname}
        </div>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {category}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {routes
              .filter((r) => r.category === category)
              .map((route) => {
                const isActive = location.pathname === route.path;
                return (
                  <button
                    key={route.path}
                    onClick={() => navigate(route.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      fontWeight: isActive ? '500' : '400',
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
                    <span>{route.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {route.path}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
