import React, { ReactNode } from 'react';

interface ModernChatLayoutProps {
  sidebar: ReactNode;
  mainContent: ReactNode;
  showSidebar: boolean;
  onToggleSidebar?: () => void;
}

export function ModernChatLayout({
  sidebar,
  mainContent,
  showSidebar,
  onToggleSidebar
}: ModernChatLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        padding: '28px clamp(16px, 5vw, 40px)',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 56px)',
          maxWidth: '1400px',
          margin: '0 auto',
          gap: '20px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: showSidebar ? '100%' : '380px',
            maxWidth: '380px',
            minWidth: '320px',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'transform 0.3s ease',
            position: 'relative',
            zIndex: 2
          }}
          className="chat-sidebar"
        >
          {sidebar}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
            position: 'relative'
          }}
          className="chat-main"
        >
          {mainContent}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .chat-sidebar {
              position: fixed !important;
              top: 0;
              right: 0;
              height: 100vh;
              z-index: 100;
              transform: ${showSidebar ? 'translateX(0)' : 'translateX(100%)'};
              max-width: 100%;
              width: 100%;
              border-radius: 0 !important;
            }

            .chat-main {
              width: 100%;
            }
          }

          @media (min-width: 769px) {
            .chat-sidebar {
              display: flex !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
