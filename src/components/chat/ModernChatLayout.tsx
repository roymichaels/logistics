import React, { ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

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
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: tokens.colors.panel,
        direction: 'rtl'
      }}
    >
      <div
        style={{
          width: showSidebar ? '100%' : '380px',
          maxWidth: '380px',
          minWidth: '320px',
          borderLeft: `1px solid ${tokens.colors.background.cardBorder}`,
          background: tokens.colors.background.card,
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
          background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
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
  );
}
