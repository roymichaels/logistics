import React from 'react';

interface BusinessBottomNavProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export function BusinessBottomNav({ activePage = 'dashboard', onNavigate }: BusinessBottomNavProps) {
  const navItems = [
    { id: 'tasks', icon: '✓', label: 'משימות', labelEn: 'Tasks' },
    { id: 'dispatch', icon: '⚡', label: 'פעולות מהירות', labelEn: 'Quick Actions' },
    { id: 'notifications', icon: '🔔', label: 'התראות', labelEn: 'Alerts' },
    { id: 'chat', icon: '💬', label: 'צ׳אט', labelEn: 'Chat' },
    { id: 'reports', icon: '📋', label: 'תפקידי', labelEn: 'Reports' }
  ];

  const handleNavClick = (pageId: string) => {
    if (onNavigate) {
      onNavigate(pageId);
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .business-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
      <nav
        className="business-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 15, 30, 0.98) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 12px',
            background: activePage === item.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '60px',
            color: activePage === item.id ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <span style={{
            fontSize: '22px',
            filter: activePage === item.id ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))' : 'none',
            transition: 'all 0.2s ease'
          }}>
            {item.icon}
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: activePage === item.id ? '600' : '400',
            whiteSpace: 'nowrap'
          }}>
            {item.label}
          </span>
        </button>
      ))}
      </nav>
    </>
  );
}
