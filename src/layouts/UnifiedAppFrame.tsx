import React, { useState } from 'react';
import { UnifiedMenuPanel, MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';

interface UnifiedAppFrameProps {
  children: React.ReactNode;
  menuItems: MenuItemConfig[];
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  headerContent?: React.ReactNode;
}

export function UnifiedAppFrame({
  children,
  menuItems,
  currentPath,
  onNavigate,
  title = 'Menu',
  headerContent,
}: UnifiedAppFrameProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: 'rgba(18, 18, 20, 0.95)',
      }}
    >
      {headerContent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 12, 0.3)',
          }}
        >
          {headerContent}
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            ☰
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
        }}
      >
        {children}
      </div>

      <UnifiedMenuPanel
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title={title}
      />
    </div>
  );
}
