import React, { useEffect } from 'react';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  path: string;
}

interface UnifiedMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItemConfig[];
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
}

export function UnifiedMenuPanel({
  isOpen,
  onClose,
  items,
  currentPath,
  onNavigate,
  title = 'Menu',
}: UnifiedMenuPanelProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = (itemPath: string) => {
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s ease-in-out',
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '5%',
          bottom: '5%',
          right: '16px',
          width: '340px',
          maxWidth: 'calc(100vw - 32px)',
          backgroundColor: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 12, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.95)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isActive(item.path)
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'transparent',
                color: isActive(item.path)
                  ? '#60a5fa'
                  : 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontWeight: isActive(item.path) ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }
              }}
            >
              {isActive(item.path) && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0',
                    width: '3px',
                    height: '60%',
                    backgroundColor: '#60a5fa',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
