import React, { useEffect, useState } from 'react';
import { NavigationSidebar, NavigationSection } from './NavigationSidebar';
import { NavigationContent } from './NavigationContent';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function NavigationDrawer({ isOpen, onClose, children }: NavigationDrawerProps) {
  const [activeSection, setActiveSection] = useState('main');

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

  // Define navigation sections
  const sections: NavigationSection[] = [
    { id: 'main', label: 'Main', icon: '🏠' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

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
        <NavigationSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onClose={onClose}
        />
        <NavigationContent activeSection={activeSection}>{children}</NavigationContent>
      </div>
    </>
  );
}
