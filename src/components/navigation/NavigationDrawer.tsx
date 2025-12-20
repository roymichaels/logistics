import React, { useEffect } from 'react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function NavigationDrawer({ isOpen, onClose, children }: NavigationDrawerProps) {
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
          overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '72px',
            backgroundColor: 'rgba(10, 10, 12, 0.6)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 0',
            gap: '8px',
            alignItems: 'center',
          }}
        >
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
              marginBottom: '8px',
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
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
