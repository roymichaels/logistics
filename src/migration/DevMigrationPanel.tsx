import React, { useState } from 'react';
import { DevConsoleDrawer } from '../components/dev/DevConsoleDrawer';

export function DevMigrationPanel() {
  if (process.env.NODE_ENV !== 'development') return null;

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9999,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 0 rgba(59, 130, 246, 0.4)',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)',
          animation: 'pulse 2s infinite',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 0 rgba(59, 130, 246, 0.4)';
        }}
      >
        🛠️
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 8px rgba(59, 130, 246, 0);
          }
        }
      `}</style>

      <DevConsoleDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
